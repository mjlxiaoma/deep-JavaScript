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

  async checkUploadedChunks(md5: string, fileName: string, totalChunks: number): Promise<number[]> {
    try {
      const response: AxiosResponse<UploadResponse> = await axios.post(`${this.config.apiBaseUrl}/check-chunks`, {
        md5,
        fileName,
        totalChunks
      })
      
      return response.data.uploadedChunks || []
    } catch (error) {
      console.error('检查已上传分片失败:', error)
      throw error
    }
  }

  async uploadChunk(
    chunk: Blob,
    chunkIndex: number,
    md5: string,
    fileName: string,
    totalChunks: number,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    try {
      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('md5', md5)
      formData.append('fileName', fileName)
      formData.append('totalChunks', totalChunks.toString())

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

  destroy() {
    if (this.hashWorker) {
      this.hashWorker.terminate()
    }
  }
} 