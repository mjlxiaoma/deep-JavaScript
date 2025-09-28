import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UploadFile, UploadStatus } from '@/types/upload'

export const useUploadStore = defineStore('upload', () => {
  // 状态
  const uploads = ref<Map<string, UploadFile>>(new Map())
  const serverOnline = ref(false)

  // 计算属性
  const uploadList = computed(() => Array.from(uploads.value.values()))
  const uploadingCount = computed(() => 
    uploadList.value.filter(upload => upload.status === 'uploading').length
  )
  const completedCount = computed(() => 
    uploadList.value.filter(upload => upload.status === 'success').length
  )

  // 方法
  const addUpload = (upload: UploadFile) => {
    uploads.value.set(upload.id, upload)
  }

  const updateUpload = (id: string, updates: Partial<UploadFile>) => {
    const upload = uploads.value.get(id)
    if (upload) {
      Object.assign(upload, updates)
    }
  }

  const removeUpload = (id: string) => {
    uploads.value.delete(id)
  }

  const clearCompleted = () => {
    uploadList.value.forEach(upload => {
      if (upload.status === 'success') {
        uploads.value.delete(upload.id)
      }
    })
  }

  const setServerStatus = (online: boolean) => {
    serverOnline.value = online
  }

  return {
    // 状态
    uploads,
    serverOnline,
    
    // 计算属性
    uploadList,
    uploadingCount,
    completedCount,
    
    // 方法
    addUpload,
    updateUpload,
    removeUpload,
    clearCompleted,
    setServerStatus
  }
}) 