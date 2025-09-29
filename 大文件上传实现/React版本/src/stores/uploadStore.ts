import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { 
  UploadStore, 
  UploadFile, 
  UploadStatus, 
  UploadConfig, 
  UploadStats,
  ServerStatus,
  UPLOAD_CONSTANTS
} from '../types/upload'

// 默认配置
const defaultConfig: UploadConfig = {
  chunkSize: UPLOAD_CONSTANTS.DEFAULT_CHUNK_SIZE,
  maxConcurrent: UPLOAD_CONSTANTS.MAX_CONCURRENT_UPLOADS,
  maxRetries: UPLOAD_CONSTANTS.MAX_RETRIES,
  timeout: UPLOAD_CONSTANTS.REQUEST_TIMEOUT,
  enableMD5: true,
  autoStart: false
}

// 默认服务器状态
const defaultServerStatus: ServerStatus = {
  online: false,
  message: '未连接',
  timestamp: Date.now()
}

// 默认统计信息
const defaultStats: UploadStats = {
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  totalSize: 0,
  uploadedSize: 0,
  totalProgress: 0,
  averageSpeed: 0
}

// 生成文件ID
const generateFileId = (file: File): string => {
  return `${file.name}_${file.size}_${file.lastModified}_${Math.random().toString(36).substr(2, 9)}`
}

// 创建上传文件对象
const createUploadFile = (file: File, config: UploadConfig): UploadFile => {
  const totalChunks = Math.ceil(file.size / config.chunkSize)
  
  return {
    id: generateFileId(file),
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    md5: '',
    status: UploadStatus.WAITING,
    progress: 0,
    uploadedChunks: 0,
    totalChunks,
    speed: 0,
    remainingTime: 0,
    startTime: Date.now(),
    retryCount: 0,
    maxRetries: config.maxRetries,
    chunkSize: config.chunkSize,
    uploadedBytes: 0
  }
}

// 计算统计信息
const calculateStats = (files: UploadFile[]): UploadStats => {
  const totalFiles = files.length
  const completedFiles = files.filter(f => f.status === UploadStatus.COMPLETED).length
  const failedFiles = files.filter(f => f.status === UploadStatus.ERROR).length
  const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0)
  const uploadedSize = files.reduce((sum, f) => sum + f.uploadedBytes, 0)
  const totalProgress = totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0
  
  // 计算平均速度（只考虑正在上传的文件）
  const uploadingFiles = files.filter(f => f.status === UploadStatus.UPLOADING && f.speed > 0)
  const averageSpeed = uploadingFiles.length > 0 
    ? uploadingFiles.reduce((sum, f) => sum + f.speed, 0) / uploadingFiles.length 
    : 0

  return {
    totalFiles,
    completedFiles,
    failedFiles,
    totalSize,
    uploadedSize,
    totalProgress,
    averageSpeed
  }
}

export const useUploadStore = create<UploadStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // 状态
      files: [],
      serverStatus: defaultServerStatus,
      config: defaultConfig,
      stats: defaultStats,
      isUploading: false,

      // 计算属性
      getFileById: (id: string) => {
        return get().files.find(file => file.id === id)
      },

      getFilesByStatus: (status: UploadStatus) => {
        return get().files.filter(file => file.status === status)
      },

      getUploadingFiles: () => {
        return get().files.filter(file => 
          file.status === UploadStatus.UPLOADING || 
          file.status === UploadStatus.HASHING
        )
      },

      getCompletedFiles: () => {
        return get().files.filter(file => file.status === UploadStatus.COMPLETED)
      },

      getFailedFiles: () => {
        return get().files.filter(file => file.status === UploadStatus.ERROR)
      },

      // 文件管理
      addFiles: (newFiles: File[]) => {
        const state = get()
        const validFiles = newFiles.filter(file => {
          // 检查文件大小
          if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
            console.warn(`文件 ${file.name} 超过最大大小限制`)
            return false
          }
          
          // 检查是否已存在相同文件
          const exists = state.files.some(f => 
            f.fileName === file.name && 
            f.fileSize === file.size && 
            f.file.lastModified === file.lastModified
          )
          
          if (exists) {
            console.warn(`文件 ${file.name} 已存在`)
            return false
          }
          
          return true
        })

        const uploadFiles = validFiles.map(file => createUploadFile(file, state.config))
        const newFiles2 = [...state.files, ...uploadFiles]
        const newStats = calculateStats(newFiles2)
        
        set({ files: newFiles2, stats: newStats })
      },

      removeFile: (id: string) => {
        const state = get()
        const newFiles = state.files.filter(file => file.id !== id)
        const newStats = calculateStats(newFiles)
        set({ files: newFiles, stats: newStats })
      },

      clearCompleted: () => {
        const state = get()
        const newFiles = state.files.filter(file => file.status !== UploadStatus.COMPLETED)
        const newStats = calculateStats(newFiles)
        set({ files: newFiles, stats: newStats })
      },

      clearAll: () => {
        set({ files: [], stats: defaultStats, isUploading: false })
      },

      // 上传控制
      startUpload: (id: string) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id && file.status === UploadStatus.WAITING
            ? { ...file, status: UploadStatus.HASHING, startTime: Date.now() }
            : file
        )
        set({ files: newFiles, isUploading: true })
      },

      pauseUpload: (id: string) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id && (file.status === UploadStatus.UPLOADING || file.status === UploadStatus.HASHING)
            ? { ...file, status: UploadStatus.PAUSED }
            : file
        )
        
        // 检查是否还有正在上传的文件
        const hasUploading = newFiles.some(f => 
          f.status === UploadStatus.UPLOADING || f.status === UploadStatus.HASHING
        )
        set({ files: newFiles, isUploading: hasUploading })
      },

      resumeUpload: (id: string) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id && file.status === UploadStatus.PAUSED
            ? { ...file, status: file.md5 ? UploadStatus.UPLOADING : UploadStatus.HASHING }
            : file
        )
        set({ files: newFiles, isUploading: true })
      },

      cancelUpload: (id: string) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id
            ? { ...file, status: UploadStatus.CANCELLED, endTime: Date.now() }
            : file
        )
        
        // 检查是否还有正在上传的文件
        const hasUploading = newFiles.some(f => 
          f.status === UploadStatus.UPLOADING || f.status === UploadStatus.HASHING
        )
        const newStats = calculateStats(newFiles)
        set({ files: newFiles, isUploading: hasUploading, stats: newStats })
      },

      retryUpload: (id: string) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id && file.status === UploadStatus.ERROR
            ? { 
                ...file, 
                status: UploadStatus.WAITING,
                retryCount: file.retryCount + 1,
                error: undefined,
                progress: 0,
                uploadedChunks: 0,
                uploadedBytes: 0,
                speed: 0,
                remainingTime: 0
              }
            : file
        )
        set({ files: newFiles })
      },

      // 批量操作
      startAllUploads: () => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.status === UploadStatus.WAITING
            ? { ...file, status: UploadStatus.HASHING, startTime: Date.now() }
            : file
        )
        set({ files: newFiles, isUploading: true })
      },

      pauseAllUploads: () => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.status === UploadStatus.UPLOADING || file.status === UploadStatus.HASHING
            ? { ...file, status: UploadStatus.PAUSED }
            : file
        )
        set({ files: newFiles, isUploading: false })
      },

      // 状态更新
      updateFileStatus: (id: string, status: UploadStatus) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id
            ? { 
                ...file, 
                status,
                endTime: status === UploadStatus.COMPLETED || status === UploadStatus.ERROR ? Date.now() : file.endTime
              }
            : file
        )
        
        // 更新全局上传状态
        const hasUploading = newFiles.some(f => 
          f.status === UploadStatus.UPLOADING || f.status === UploadStatus.HASHING
        )
        const newStats = calculateStats(newFiles)
        set({ files: newFiles, isUploading: hasUploading, stats: newStats })
      },

      updateFileProgress: (id: string, progress: number, speed?: number) => {
        const state = get()
        const newFiles = state.files.map(file => {
          if (file.id === id) {
            const newProgress = Math.min(100, Math.max(0, progress))
            const uploadedBytes = Math.floor((file.fileSize * newProgress) / 100)
            const newSpeed = speed !== undefined ? speed : file.speed
            const remainingBytes = file.fileSize - uploadedBytes
            const remainingTime = newSpeed > 0 ? Math.ceil(remainingBytes / newSpeed) : 0
            
            return {
              ...file,
              progress: newProgress,
              uploadedBytes,
              speed: newSpeed,
              remainingTime
            }
          }
          return file
        })
        
        const newStats = calculateStats(newFiles)
        set({ files: newFiles, stats: newStats })
      },

      updateFileError: (id: string, error: string) => {
        const state = get()
        const newFiles = state.files.map(file => 
          file.id === id
            ? { ...file, status: UploadStatus.ERROR, error, endTime: Date.now() }
            : file
        )
        
        // 更新全局上传状态
        const hasUploading = newFiles.some(f => 
          f.status === UploadStatus.UPLOADING || f.status === UploadStatus.HASHING
        )
        const newStats = calculateStats(newFiles)
        set({ files: newFiles, isUploading: hasUploading, stats: newStats })
      },

      updateServerStatus: (status: ServerStatus) => {
        set({ serverStatus: status })
      },

      // 配置管理
      updateConfig: (newConfig: Partial<UploadConfig>) => {
        const state = get()
        set({ config: { ...state.config, ...newConfig } })
      }
    })),
    {
      name: 'upload-store',
      partialize: (state: UploadStore) => ({
        config: state.config,
        // 不持久化文件列表和临时状态
      })
    }
  )
) 