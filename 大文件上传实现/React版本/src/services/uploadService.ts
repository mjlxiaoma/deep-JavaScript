import axios, { AxiosProgressEvent } from 'axios'
import SparkMD5 from 'spark-md5'
import { 
  UploadFile, 
  ChunkInfo, 
  UploadResponse, 
  CheckChunksResponse, 
  CompleteUploadResponse, 
  ServerStatus,
  UploadError,
  UPLOAD_CONSTANTS
} from '../types/upload'

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: UPLOAD_CONSTANTS.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Web Worker for MD5 calculation
let hashWorker: Worker | null = null

// 初始化Web Worker
const initHashWorker = (): Worker => {
  if (!hashWorker) {
    const workerCode = `
      importScripts('https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js');
      
      self.onmessage = function(e) {
        const { fileId, file, chunkSize } = e.data;
        const spark = new SparkMD5.ArrayBuffer();
        const fileReader = new FileReader();
        let currentChunk = 0;
        const chunks = Math.ceil(file.size / chunkSize);
        
        const loadNext = () => {
          const start = currentChunk * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const blob = file.slice(start, end);
          
          fileReader.readAsArrayBuffer(blob);
        };
        
        fileReader.onload = function(e) {
          if (e.target && e.target.result) {
            spark.append(e.target.result);
            currentChunk++;
            
            // 发送进度
            self.postMessage({
              type: 'progress',
              fileId: fileId,
              progress: (currentChunk / chunks) * 100
            });
            
            if (currentChunk < chunks) {
              loadNext();
            } else {
              // 完成
              const md5 = spark.end();
              self.postMessage({
                type: 'complete',
                fileId: fileId,
                md5: md5
              });
            }
          }
        };
        
        fileReader.onerror = function() {
          self.postMessage({
            type: 'error',
            fileId: fileId,
            error: '文件读取失败'
          });
        };
        
        loadNext();
      };
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    hashWorker = new Worker(URL.createObjectURL(blob))
  }
  
  return hashWorker
}

// 上传服务类
export class UploadService {
  private static instance: UploadService
  private uploadTasks: Map<string, AbortController> = new Map()
  
  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService()
    }
    return UploadService.instance
  }

  // 检查服务器状态
  async checkServerStatus(): Promise<ServerStatus> {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 })
      return {
        online: true,
        message: response.data.message || '服务器在线',
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        online: false,
        message: '服务器连接失败',
        timestamp: Date.now()
      }
    }
  }

  // 计算文件MD5
  async calculateFileHash(
    file: File, 
    chunkSize: number,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = initHashWorker()
      const timeoutId = setTimeout(() => {
        reject(new UploadError('MD5计算超时', 'HASH_TIMEOUT'))
      }, UPLOAD_CONSTANTS.HASH_WORKER_TIMEOUT)

      const handleMessage = (e: MessageEvent) => {
        const { type, fileId, progress, md5, error } = e.data
        
        if (type === 'progress' && onProgress) {
          onProgress(progress)
        } else if (type === 'complete') {
          clearTimeout(timeoutId)
          worker.removeEventListener('message', handleMessage)
          resolve(md5)
        } else if (type === 'error') {
          clearTimeout(timeoutId)
          worker.removeEventListener('message', handleMessage)
          reject(new UploadError(error, 'HASH_ERROR'))
        }
      }

      worker.addEventListener('message', handleMessage)
      worker.postMessage({
        fileId: `${file.name}_${Date.now()}`,
        file,
        chunkSize
      })
    })
  }

  // 创建文件分片
  createChunks(file: File, chunkSize: number): ChunkInfo[] {
    const chunks: ChunkInfo[] = []
    const totalChunks = Math.ceil(file.size / chunkSize)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const blob = file.slice(start, end)
      
      chunks.push({
        index: i,
        start,
        end,
        size: blob.size,
        blob,
        uploaded: false,
        retryCount: 0
      })
    }
    
    return chunks
  }

  // 检查已上传的分片
  async checkUploadedChunks(fileId: string, md5: string, fileName: string, totalChunks: number): Promise<number[]> {
    try {
      const response = await apiClient.post<CheckChunksResponse>('/check-chunks', {
        md5,
        fileName,
        totalChunks
      })
      
      if (response.data.success) {
        return response.data.uploadedChunks || []
      } else {
        throw new UploadError(response.data.error || 'Check chunks failed', 'CHECK_CHUNKS_FAILED')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UploadError(`检查分片失败: ${error.message}`, 'NETWORK_ERROR')
      }
      throw error
    }
  }

  // 上传单个分片
  async uploadChunk(
    fileId: string,
    chunk: ChunkInfo,
    md5: string,
    fileName: string,
    totalChunks: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const formData = new FormData()
    formData.append('chunk', chunk.blob)
    formData.append('chunkIndex', chunk.index.toString())
    formData.append('md5', md5)
    formData.append('fileName', fileName)
    formData.append('totalChunks', totalChunks.toString())

    const controller = new AbortController()
    this.uploadTasks.set(`${fileId}_${chunk.index}`, controller)

    try {
      const response = await apiClient.post<UploadResponse>('/upload-chunk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        signal: controller.signal,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            onProgress(progress)
          }
        }
      })

      if (!response.data.success) {
        throw new UploadError(response.data.message, 'CHUNK_UPLOAD_FAILED', fileId, chunk.index)
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new UploadError('上传已取消', 'UPLOAD_CANCELLED', fileId, chunk.index)
      } else if (axios.isAxiosError(error)) {
        throw new UploadError(`分片上传失败: ${error.message}`, 'NETWORK_ERROR', fileId, chunk.index)
      }
      throw error
    } finally {
      this.uploadTasks.delete(`${fileId}_${chunk.index}`)
    }
  }

  // 并发上传多个分片
  async uploadChunksConcurrently(
    fileId: string,
    chunks: ChunkInfo[],
    md5: string,
    fileName: string,
    totalChunks: number,
    maxConcurrent: number,
    onProgress?: (chunkIndex: number, progress: number) => void,
    onChunkComplete?: (chunkIndex: number) => void
  ): Promise<void> {
    const pendingChunks = chunks.filter(chunk => !chunk.uploaded)
    
    if (pendingChunks.length === 0) {
      return
    }

    const uploadQueue = [...pendingChunks]
    const activeUploads: Promise<void>[] = []

    const uploadNext = async (): Promise<void> => {
      const chunk = uploadQueue.shift()
      if (!chunk) return

      try {
        await this.uploadChunk(
          fileId,
          chunk,
          md5,
          fileName,
          totalChunks,
          (progress: number) => onProgress?.(chunk.index, progress)
        )
        
        chunk.uploaded = true
        onChunkComplete?.(chunk.index)
      } catch (error) {
        chunk.retryCount++
        if (chunk.retryCount < UPLOAD_CONSTANTS.MAX_RETRIES) {
          uploadQueue.push(chunk) // 重新加入队列
        } else {
          throw error
        }
      }

      // 继续上传下一个
      if (uploadQueue.length > 0) {
        return uploadNext()
      }
    }

    // 启动并发上传
    for (let i = 0; i < Math.min(maxConcurrent, uploadQueue.length); i++) {
      activeUploads.push(uploadNext())
    }

    // 等待所有上传完成
    await Promise.all(activeUploads)
  }

  // 完成上传
  async completeUpload(fileId: string, fileName: string, md5: string, totalChunks: number): Promise<CompleteUploadResponse['data']> {
    try {
      const response = await apiClient.post<CompleteUploadResponse>('/complete-upload', {
        md5,
        fileName,
        totalChunks
      })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new UploadError(response.data.message, 'COMPLETE_UPLOAD_FAILED')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UploadError(`完成上传失败: ${error.message}`, 'NETWORK_ERROR')
      }
      throw error
    }
  }

  // 取消上传
  cancelUpload(fileId: string): void {
    // 取消所有相关的分片上传
    for (const [taskId, controller] of this.uploadTasks.entries()) {
      if (taskId.startsWith(fileId)) {
        controller.abort()
        this.uploadTasks.delete(taskId)
      }
    }
  }

  // 重试上传
  async retryUpload(
    uploadFile: UploadFile,
    onProgress?: (progress: number) => void,
    onChunkComplete?: (chunkIndex: number) => void
  ): Promise<void> {
    const chunks = this.createChunks(uploadFile.file, uploadFile.chunkSize)
    
    // 检查已上传的分片
    const uploadedChunks = await this.checkUploadedChunks(
      uploadFile.id, 
      uploadFile.md5, 
      uploadFile.fileName, 
      uploadFile.totalChunks
    )
    uploadedChunks.forEach(index => {
      if (chunks[index]) {
        chunks[index].uploaded = true
      }
    })

    // 上传剩余分片
    await this.uploadChunksConcurrently(
      uploadFile.id,
      chunks,
      uploadFile.md5,
      uploadFile.fileName,
      uploadFile.totalChunks,
      UPLOAD_CONSTANTS.MAX_CONCURRENT_UPLOADS,
      (chunkIndex: number, progress: number) => {
        const totalProgress = (uploadedChunks.length + (progress / 100)) / chunks.length * 100
        onProgress?.(totalProgress)
      },
      onChunkComplete
    )
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化上传速度
  static formatSpeed(bytesPerSecond: number): string {
    return `${UploadService.formatFileSize(bytesPerSecond)}/s`
  }

  // 格式化剩余时间
  static formatRemainingTime(seconds: number): string {
    if (seconds === 0 || !isFinite(seconds)) return '计算中...'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`
    } else {
      return `${secs}秒`
    }
  }

  // 清理资源
  cleanup(): void {
    // 取消所有进行中的上传
    for (const controller of this.uploadTasks.values()) {
      controller.abort()
    }
    this.uploadTasks.clear()

    // 终止Web Worker
    if (hashWorker) {
      hashWorker.terminate()
      hashWorker = null
    }
  }
}

// 导出单例实例
export const uploadService = UploadService.getInstance() 