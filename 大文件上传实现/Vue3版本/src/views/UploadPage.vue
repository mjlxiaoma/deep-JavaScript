<template>
  <div class="upload-page">
    <div class="container">
      <!-- 头部 -->
      <div class="header">
        <h1><el-icon><Upload /></el-icon> Vue3 断点续传上传系统</h1>
        <p>支持大文件上传、MD5校验、断点续传功能</p>
      </div>

      <!-- 主要内容 -->
      <div class="main-content">
        <!-- 服务器状态 -->
        <el-alert
          :title="serverStatusText"
          :type="serverOnline ? 'success' : 'error'"
          :closable="false"
          class="server-status"
          show-icon
        />

        <!-- 上传区域 -->
        <div
          class="upload-area"
          :class="{ 'is-dragover': isDragOver }"
          @click="handleUploadClick"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <el-icon class="upload-icon" size="60"><UploadFilled /></el-icon>
          <div class="upload-text">
            <h3>点击选择文件或拖拽到此处</h3>
            <p>支持多文件同时上传，自动断点续传</p>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            style="display: none"
            @change="handleFileSelect"
          />
        </div>

        <!-- 统计信息 -->
        <div v-if="uploadList.length > 0" class="stats">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="总文件数" :value="uploadList.length" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="上传中" :value="uploadingCount" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="已完成" :value="completedCount" />
            </el-col>
          </el-row>
        </div>

        <!-- 文件列表 -->
        <div v-if="uploadList.length > 0" class="file-list">
          <div class="list-header">
            <h3>上传列表</h3>
            <el-button
              v-if="completedCount > 0"
              type="danger"
              size="small"
              @click="clearCompleted"
            >
              清除已完成
            </el-button>
          </div>

          <transition-group name="list" tag="div">
            <div
              v-for="upload in uploadList"
              :key="upload.id"
              class="file-item"
            >
              <div class="file-header">
                <div class="file-info">
                  <div
                    class="file-icon"
                    :style="{ backgroundColor: getFileIconColor(upload.name) }"
                  >
                    <el-icon><Document /></el-icon>
                  </div>
                  <div class="file-details">
                    <h4>{{ upload.name }}</h4>
                    <p>{{ formatFileSize(upload.size) }} • {{ upload.totalChunks }} 分片</p>
                  </div>
                </div>

                <div class="file-actions">
                  <el-tag
                    :type="getStatusType(upload.status)"
                    size="small"
                  >
                    {{ getStatusText(upload.status) }}
                  </el-tag>

                  <el-button
                    v-if="upload.status === 'uploading'"
                    type="warning"
                    size="small"
                    @click="pauseUpload(upload.id)"
                  >
                    <el-icon><VideoPause /></el-icon>
                    暂停
                  </el-button>

                  <el-button
                    v-if="upload.status === 'paused'"
                    type="primary"
                    size="small"
                    @click="resumeUpload(upload.id)"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    继续
                  </el-button>

                  <el-button
                    v-if="upload.status !== 'success'"
                    type="danger"
                    size="small"
                    @click="cancelUpload(upload.id)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>

              <div v-if="upload.status !== 'preparing'" class="progress-section">
                <el-progress
                  :percentage="Math.round(upload.progress)"
                  :status="getProgressStatus(upload.status)"
                  :stroke-width="8"
                />
                <div class="progress-info">
                  <span>{{ upload.message }}</span>
                  <span>{{ Math.round(upload.progress) }}%</span>
                </div>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useUploadStore } from '@/stores/upload'
import { UploadService } from '@/services/upload'
import type { UploadFile, UploadConfig } from '@/types/upload'

// 组合式API
const uploadStore = useUploadStore()
const fileInputRef = ref<HTMLInputElement>()
const isDragOver = ref(false)

// 上传服务配置
const uploadConfig: UploadConfig = {
  chunkSize: 1024 * 1024, // 1MB
  maxConcurrent: 3,
  retryTimes: 3,
  apiBaseUrl: '/api'
}

const uploadService = new UploadService(uploadConfig)

// 计算属性 - 使用 storeToRefs 保持响应式
const { uploadList, uploadingCount, completedCount, serverOnline } = storeToRefs(uploadStore)

// 添加调试日志
watchEffect(() => {
  console.log('Store状态:', {
    uploadList: uploadList.value,
    uploadingCount: uploadingCount.value, 
    completedCount: completedCount.value,
    serverOnline: serverOnline.value
  })
})

const serverStatusText = computed(() => 
  serverOnline.value ? '服务器连接正常' : '服务器连接失败，请检查后端服务'
)

// 方法
const generateFileId = (file: File): string => {
  return `${file.name}_${file.size}_${file.lastModified}_${Date.now()}`
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIconColor = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const colorMap: Record<string, string> = {
    pdf: '#f56565',
    doc: '#3182ce',
    docx: '#3182ce',
    xls: '#38a169',
    xlsx: '#38a169',
    ppt: '#ed8936',
    pptx: '#ed8936',
    zip: '#718096',
    rar: '#718096',
    jpg: '#e53e3e',
    jpeg: '#e53e3e',
    png: '#e53e3e',
    gif: '#e53e3e',
    mp4: '#805ad5',
    avi: '#805ad5',
    mp3: '#38b2ac',
    wav: '#38b2ac'
  }
  return colorMap[ext || ''] || '#718096'
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    preparing: 'info',
    calculating: 'warning',
    ready: 'info',
    uploading: 'primary',
    paused: 'warning',
    success: 'success',
    error: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    preparing: '准备中',
    calculating: '计算中',
    ready: '就绪',
    uploading: '上传中',
    paused: '已暂停',
    success: '已完成',
    error: '失败'
  }
  return textMap[status] || status
}

const getProgressStatus = (status: string) => {
  if (status === 'success') return 'success'
  if (status === 'error') return 'exception'
  return undefined
}

// 文件处理
const handleUploadClick = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
    target.value = ''
  }
}

const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    processFiles(Array.from(event.dataTransfer.files))
  }
}

const processFiles = (files: File[]) => {
  if (!serverOnline) {
    ElMessage.error('服务器未连接，无法上传文件')
    return
  }

  files.forEach(addFile)
}

const addFile = (file: File) => {
  const fileId = generateFileId(file)
  const totalChunks = Math.ceil(file.size / uploadConfig.chunkSize)

  const upload: UploadFile = {
    id: fileId,
    file,
    name: file.name,
    size: file.size,
    status: 'preparing',
    progress: 0,
    message: '准备计算文件校验值...',
    totalChunks,
    uploadedChunks: 0,
    hashProgress: 0,
    chunkHashes: new Array(totalChunks).fill(''),
    paused: false,
    createdAt: new Date()
  }

  uploadStore.addUpload(upload)
  startUpload(fileId)
}

const startUpload = async (fileId: string) => {
  const upload = uploadList.value.find(u => u.id === fileId)
  if (!upload) return

  try {
    // 1. 计算文件MD5
    uploadStore.updateUpload(fileId, {
      status: 'calculating',
      message: '正在计算文件校验值...'
    })

    const md5 = await uploadService.calculateFileHash(upload.file, (progress) => {
      uploadStore.updateUpload(fileId, {
        progress: progress * 0.3, // MD5计算占30%进度
        message: `计算校验值中... ${Math.round(progress)}%`
      })
    })

    uploadStore.updateUpload(fileId, { md5 })

    // 2. 检查已上传的分片
    uploadStore.updateUpload(fileId, {
      status: 'uploading',
      message: '检查已上传的分片...'
    })

    const uploadedChunks = await uploadService.checkUploadedChunks(
      md5, 
      upload.name, 
      upload.totalChunks
    )

    uploadStore.updateUpload(fileId, {
      uploadedChunks: uploadedChunks.length,
      progress: 30 + (uploadedChunks.length / upload.totalChunks) * 70
    })

    if (uploadedChunks.length === upload.totalChunks) {
      uploadStore.updateUpload(fileId, {
        status: 'success',
        message: '文件已存在，上传完成',
        progress: 100,
        completedAt: new Date()
      })
      return
    }

    // 3. 上传剩余分片
    await uploadRemainingChunks(fileId, uploadedChunks)

  } catch (error) {
    console.error('上传失败:', error)
    uploadStore.updateUpload(fileId, {
      status: 'error',
      message: error instanceof Error ? error.message : '上传失败'
    })
  }
}

const uploadRemainingChunks = async (fileId: string, uploadedChunks: number[]) => {
  const upload = uploadList.value.find(u => u.id === fileId)
  if (!upload || !upload.md5) return

  const uploadedSet = new Set(uploadedChunks)
  uploadStore.updateUpload(fileId, {
    message: '正在上传文件分片...'
  })

  for (let i = 0; i < upload.totalChunks; i++) {
    if (uploadedSet.has(i) || upload.paused) continue

    const start = i * uploadConfig.chunkSize
    const end = Math.min(start + uploadConfig.chunkSize, upload.file.size)
    const chunk = upload.file.slice(start, end)

    const success = await uploadService.uploadChunk(
      chunk,
      i,
      upload.md5,
      upload.name,
      upload.totalChunks
    )

    if (success) {
      const newUploadedChunks = upload.uploadedChunks + 1
      const progress = 30 + (newUploadedChunks / upload.totalChunks) * 70
      
      uploadStore.updateUpload(fileId, {
        uploadedChunks: newUploadedChunks,
        progress,
        message: `上传中... ${newUploadedChunks}/${upload.totalChunks}`
      })
    } else {
      uploadStore.updateUpload(fileId, {
        status: 'error',
        message: '分片上传失败'
      })
      return
    }
  }

  // 4. 完成上传
  if (!upload.paused && upload.uploadedChunks === upload.totalChunks) {
    await completeUpload(fileId)
  }
}

const completeUpload = async (fileId: string) => {
  const upload = uploadList.value.find(u => u.id === fileId)
  if (!upload || !upload.md5) return

  try {
    uploadStore.updateUpload(fileId, {
      message: '正在合并文件...'
    })

    await uploadService.completeUpload(upload.md5, upload.name, upload.totalChunks)
    
    uploadStore.updateUpload(fileId, {
      status: 'success',
      message: '上传完成',
      progress: 100,
      completedAt: new Date()
    })

    ElMessage.success(`文件 ${upload.name} 上传完成`)
  } catch (error) {
    uploadStore.updateUpload(fileId, {
      status: 'error',
      message: '文件合并失败'
    })
  }
}

const pauseUpload = (fileId: string) => {
  uploadStore.updateUpload(fileId, {
    status: 'paused',
    paused: true,
    message: '上传已暂停'
  })
}

const resumeUpload = (fileId: string) => {
  uploadStore.updateUpload(fileId, {
    status: 'uploading',
    paused: false
  })
  startUpload(fileId)
}

const cancelUpload = async (fileId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此文件吗？', '确认删除', {
      type: 'warning'
    })
    uploadStore.removeUpload(fileId)
  } catch {
    // 用户取消
  }
}

const clearCompleted = async () => {
  try {
    await ElMessageBox.confirm('确定要清除所有已完成的文件吗？', '确认清除', {
      type: 'warning'
    })
    uploadStore.clearCompleted()
  } catch {
    // 用户取消
  }
}

const checkServerStatus = async () => {
  try {
    const online = await uploadService.checkServerStatus()
    console.log('服务器状态检测结果:', online)
    uploadStore.setServerStatus(online)
  } catch (error) {
    console.error('检测服务器状态失败:', error)
    uploadStore.setServerStatus(false)
  }
}

// 生命周期
onMounted(() => {
  checkServerStatus()
  // 定期检查服务器状态
  const interval = setInterval(checkServerStatus, 30000)
  
  onUnmounted(() => {
    clearInterval(interval)
    uploadService.destroy()
  })
})
</script>

<style scoped>
.upload-page {
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  text-align: center;
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1em;
}

.main-content {
  padding: 40px;
}

.server-status {
  margin-bottom: 20px;
}

.upload-area {
  border: 3px dashed #dcdfe6;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  margin-bottom: 30px;
  transition: all 0.3s ease;
  cursor: pointer;
  background: #fafafa;
}

.upload-area:hover,
.upload-area.is-dragover {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.05);
}

.upload-icon {
  color: #409eff;
  margin-bottom: 20px;
}

.upload-text h3 {
  color: #303133;
  margin: 0 0 10px 0;
  font-size: 1.5em;
}

.upload-text p {
  color: #909399;
  margin: 0;
  font-size: 1.1em;
}

.stats {
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.file-list {
  margin-top: 30px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  color: #303133;
}

.file-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.file-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.file-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.file-details h4 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.file-details p {
  margin: 0;
  color: #909399;
  font-size: 12px;
}

.file-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.progress-section {
  padding: 0 16px 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style> 