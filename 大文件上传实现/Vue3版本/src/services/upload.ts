import axios, { type AxiosResponse } from 'axios'
import SparkMD5 from 'spark-md5'
import type { UploadResponse, UploadConfig, ChunkInfo } from '@/types/upload'

export class UploadService {
  private config: UploadConfig
  private hashWorker?: Worker

  constructor(config: UploadConfig) {
    this.config = config
    this.initHashWorker()
  }

  // 初始化用于分片MD5计算的 Web Worker（避免阻塞主线程）
  private initHashWorker() {
    const workerCode = `
      self.importScripts('https://unpkg.com/spark-md5@3.0.2/spark-md5.min.js');
      
      self.onmessage = function(e) {
        const { fileId, chunk, chunkIndex } = e.data;
        
        const reader = new FileReader();
        reader.onload = function(event) {
          const arrayBuffer = event.target.result;
          const spark = new SparkMD5.ArrayBuffer();
          spark.append(arrayBuffer);
          const hash = spark.end();
          
          self.postMessage({
            fileId,
            chunkIndex,
            hash,
            success: true
          });
        };
        
        reader.onerror = function() {
          self.postMessage({
            fileId,
            chunkIndex,
            success: false,
            error: 'Failed to read chunk'
          });
        };
        
        reader.readAsArrayBuffer(chunk);
      };
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    this.hashWorker = new Worker(URL.createObjectURL(blob))
  }

  // 计算整文件MD5（用于秒传/断点续传标识）
  async calculateFileHash(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const fileReader = new FileReader()
      const chunks = Math.ceil(file.size / this.config.chunkSize)
      let currentChunk = 0

      const loadNext = () => {
        const start = currentChunk * this.config.chunkSize
        const end = Math.min(start + this.config.chunkSize, file.size)
        const chunk = file.slice(start, end)
        
        fileReader.readAsArrayBuffer(chunk)
      }

      fileReader.onload = (e) => {
        if (e.target?.result) {
          spark.append(e.target.result as ArrayBuffer)
          currentChunk++
          
          if (onProgress) {
            onProgress((currentChunk / chunks) * 100)
          }

          if (currentChunk < chunks) {
            loadNext()
          } else {
            resolve(spark.end())
          }
        }
      }

      fileReader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      loadNext()
    })
  }

  // 计算单个分片MD5（可选：用于服务端分片校验）
  async calculateChunkHash(chunk: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const reader = new FileReader()
      
      reader.onload = (e) => {
        if (e.target?.result) {
          spark.append(e.target.result as ArrayBuffer)
          resolve(spark.end())
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read chunk'))
      reader.readAsArrayBuffer(chunk)
    })
  }

  // 查询已上传分片（包含秒传判断结果）
  async checkUploadedChunks(md5: string, fileName: string, totalChunks: number, fileSize?: number): Promise<UploadResponse> {
    try {
      const response: AxiosResponse<UploadResponse> = await axios.post(`${this.config.apiBaseUrl}/check-chunks`, {
        md5,
        fileName,
        totalChunks,
        ...(fileSize !== undefined ? { fileSize } : {})
      })
      
      return response.data
    } catch (error) {
      console.error('检查已上传分片失败:', error)
      throw error
    }
  }

  // 上传单个分片（支持可选分片MD5）
  async uploadChunk(
    chunk: Blob,
    chunkIndex: number,
    md5: string,
    fileName: string,
    totalChunks: number,
    onProgress?: (progress: number) => void,
    chunkMd5?: string
  ): Promise<boolean> {
    try {
      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('md5', md5)
      formData.append('fileName', fileName)
      formData.append('totalChunks', totalChunks.toString())
      if (chunkMd5) {
        formData.append('chunkMd5', chunkMd5)
      }

      const response: AxiosResponse<UploadResponse> = await axios.post(
        `${this.config.apiBaseUrl}/upload-chunk`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100
              onProgress(progress)
            }
          }
        }
      )

      return response.data.success
    } catch (error) {
      console.error('上传分片失败:', error)
      return false
    }
  }

  // 通知服务端合并分片
  async completeUpload(md5: string, fileName: string, totalChunks: number): Promise<UploadResponse> {
    try {
      const response: AxiosResponse<UploadResponse> = await axios.post(`${this.config.apiBaseUrl}/complete-upload`, {
        md5,
        fileName,
        totalChunks
      })
      
      return response.data
    } catch (error) {
      console.error('完成上传失败:', error)
      throw error
    }
  }

  // 探活：检测后端是否可用
  async checkServerStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/health`, {
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  // 根据配置创建分片信息
  createChunks(file: File): ChunkInfo[] {
    const chunks: ChunkInfo[] = []
    const totalChunks = Math.ceil(file.size / this.config.chunkSize)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.config.chunkSize
      const end = Math.min(start + this.config.chunkSize, file.size)
      
      chunks.push({
        index: i,
        start,
        end,
        size: end - start
      })
    }
    
    return chunks
  }

  // 释放 Worker 资源
  destroy() {
    if (this.hashWorker) {
      this.hashWorker.terminate()
    }
  }
} 
