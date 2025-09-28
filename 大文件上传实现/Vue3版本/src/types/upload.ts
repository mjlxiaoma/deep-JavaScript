export type UploadStatus = 
  | 'preparing'
  | 'calculating'
  | 'ready'
  | 'uploading'
  | 'paused'
  | 'success'
  | 'error'

export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  status: UploadStatus
  progress: number
  message: string
  md5?: string
  totalChunks: number
  uploadedChunks: number
  hashProgress: number
  chunkHashes: string[]
  paused: boolean
  abortController?: AbortController
  createdAt: Date
  completedAt?: Date
}

export interface ChunkInfo {
  index: number
  start: number
  end: number
  size: number
  hash?: string
}

export interface UploadResponse {
  success: boolean
  message?: string
  uploadedChunks?: number[]
  fileUrl?: string
}

export interface ServerStatus {
  online: boolean
  message: string
}

export interface UploadConfig {
  chunkSize: number
  maxConcurrent: number
  retryTimes: number
  apiBaseUrl: string
} 