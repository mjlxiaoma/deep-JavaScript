// 上传状态枚举
export enum UploadStatus {
  WAITING = 'waiting',
  HASHING = 'hashing',
  UPLOADING = 'uploading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// 文件上传信息
export interface UploadFile {
  id: string
  file: File
  fileName: string
  fileSize: number
  fileType: string
  md5: string
  status: UploadStatus
  progress: number
  uploadedChunks: number
  totalChunks: number
  speed: number
  remainingTime: number
  startTime: number
  endTime?: number
  error?: string
  retryCount: number
  maxRetries: number
  chunkSize: number
  uploadedBytes: number
}

// 分片信息
export interface ChunkInfo {
  index: number
  start: number
  end: number
  size: number
  blob: Blob
  md5?: string
  uploaded: boolean
  retryCount: number
}

// API响应类型
export interface UploadResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

// 服务器状态
export interface ServerStatus {
  online: boolean
  message: string
  timestamp: number
}

// 上传配置
export interface UploadConfig {
  chunkSize: number
  maxConcurrent: number
  maxRetries: number
  timeout: number
  enableMD5: boolean
  autoStart: boolean
}

// 上传统计
export interface UploadStats {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalSize: number
  uploadedSize: number
  totalProgress: number
  averageSpeed: number
}

// Zustand store actions
export interface UploadActions {
  // 文件管理
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  
  // 上传控制
  startUpload: (id: string) => void
  pauseUpload: (id: string) => void
  resumeUpload: (id: string) => void
  cancelUpload: (id: string) => void
  retryUpload: (id: string) => void
  
  // 批量操作
  startAllUploads: () => void
  pauseAllUploads: () => void
  
  // 状态更新
  updateFileStatus: (id: string, status: UploadStatus) => void
  updateFileProgress: (id: string, progress: number, speed?: number) => void
  updateFileError: (id: string, error: string) => void
  updateServerStatus: (status: ServerStatus) => void
  
  // 配置管理
  updateConfig: (config: Partial<UploadConfig>) => void
}

// Zustand store state
export interface UploadStore extends UploadActions {
  files: UploadFile[]
  serverStatus: ServerStatus
  config: UploadConfig
  stats: UploadStats
  isUploading: boolean
  
  // 计算属性
  getFileById: (id: string) => UploadFile | undefined
  getFilesByStatus: (status: UploadStatus) => UploadFile[]
  getUploadingFiles: () => UploadFile[]
  getCompletedFiles: () => UploadFile[]
  getFailedFiles: () => UploadFile[]
}

// Web Worker消息类型
export interface WorkerMessage {
  type: 'start' | 'progress' | 'complete' | 'error'
  fileId: string
  data?: any
  error?: string
}

// 拖拽事件类型
export interface DragDropEvent extends DragEvent {
  dataTransfer: DataTransfer
}

// 上传历史记录
export interface UploadHistory {
  id: string
  fileName: string
  fileSize: number
  uploadTime: string
  status: UploadStatus
  speed: number
  duration: number
}

// 服务器响应 - 检查已上传分片
export interface CheckChunksResponse extends UploadResponse {
  uploadedChunks: number[]
  progress: number
  fromDatabase?: boolean
}

// 服务器响应 - 完成上传
export interface CompleteUploadResponse extends UploadResponse {
  data: {
    fileName: string
    fileSize: number
    filePath: string
    md5: string
    uploadTime: string
  }
}

// 错误类型
export class UploadError extends Error {
  code: string
  fileId?: string
  chunkIndex?: number
  
  constructor(message: string, code: string, fileId?: string, chunkIndex?: number) {
    super(message)
    this.name = 'UploadError'
    this.code = code
    this.fileId = fileId
    this.chunkIndex = chunkIndex
  }
}

// 常量
export const UPLOAD_CONSTANTS = {
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB (优化：从2MB增加，减少HTTP请求数) ⚡
  MAX_CONCURRENT_UPLOADS: 6, // 6个并发 (优化：从3增加，充分利用带宽) ⚡⚡
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT: 60000, // 60秒 (优化：从30秒增加，适应大分片)
  HASH_WORKER_TIMEOUT: 60000, // 60秒
  SERVER_CHECK_INTERVAL: 30000, // 30秒
  PROGRESS_UPDATE_INTERVAL: 100, // 100ms
  
  // 支持的文件类型
  SUPPORTED_TYPES: [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'text/*'
  ],
  
  // 最大文件大小 (10GB)
  MAX_FILE_SIZE: 10 * 1024 * 1024 * 1024,
  
  // 状态颜色映射
  STATUS_COLORS: {
    [UploadStatus.WAITING]: '#8c8c8c',
    [UploadStatus.HASHING]: '#1890ff',
    [UploadStatus.UPLOADING]: '#1890ff',
    [UploadStatus.PAUSED]: '#faad14',
    [UploadStatus.COMPLETED]: '#52c41a',
    [UploadStatus.ERROR]: '#ff4d4f',
    [UploadStatus.CANCELLED]: '#8c8c8c'
  }
} as const 