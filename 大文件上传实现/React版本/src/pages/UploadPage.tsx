import React, { useEffect, useCallback, useState } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Upload, 
  Button, 
  Space, 
  Table, 
  Progress, 
  Tag, 
  Tooltip, 
  message,
  Alert,
  Statistic,
  Modal
} from 'antd'
import {
  InboxOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClearOutlined,
  CloudServerOutlined,
  FileOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { motion, AnimatePresence } from 'framer-motion'
import { useUploadStore } from '../stores/uploadStore'
import { UploadFile, UploadStatus, UPLOAD_CONSTANTS } from '../types/upload'
import { uploadService, UploadService } from '../services/uploadService'

const { Dragger } = Upload

const UploadPage: React.FC = () => {
  const {
    files,
    serverStatus,
    stats,
    isUploading,
    addFiles,
    removeFile,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    startAllUploads,
    pauseAllUploads,
    clearCompleted,
    clearAll,
    updateFileStatus,
    updateFileProgress,
    updateFileError,
    updateServerStatus
  } = useUploadStore()

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 检查服务器状态
  const checkServerStatus = useCallback(async () => {
    try {
      const status = await uploadService.checkServerStatus()
      updateServerStatus(status)
    } catch (error) {
      updateServerStatus({
        online: false,
        message: '服务器检查失败',
        timestamp: Date.now()
      })
    }
  }, [updateServerStatus])

  // 定期检查服务器状态
  useEffect(() => {
    checkServerStatus()
    const interval = setInterval(checkServerStatus, UPLOAD_CONSTANTS.SERVER_CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [checkServerStatus])

  // 文件选择处理
  const handleFileSelect = useCallback((fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList)
    
    // 如果有文件存在，询问是否清空
    if (files.length > 0) {
      Modal.confirm({
        title: '添加新文件',
        content: `当前已有 ${files.length} 个文件，是否先清空现有文件再添加新文件？`,
        okText: '清空并添加',
        cancelText: '直接添加',
        onOk: () => {
          clearAll()
          setTimeout(() => {
            addFiles(newFiles)
            message.success(`已清空原有文件并添加 ${newFiles.length} 个新文件`)
          }, 100)
        },
        onCancel: () => {
          addFiles(newFiles)
          message.success(`已添加 ${newFiles.length} 个文件`)
        }
      })
    } else {
      addFiles(newFiles)
      message.success(`已添加 ${newFiles.length} 个文件`)
    }
  }, [files.length, addFiles, clearAll])

  // 拖拽上传处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }, [handleFileSelect])

  // 上传文件处理
  const handleUpload = useCallback(async (file: UploadFile) => {
    try {
      updateFileStatus(file.id, UploadStatus.HASHING)
      
      // 计算MD5
      const md5 = await uploadService.calculateFileHash(
        file.file,
        file.chunkSize,
        (progress) => {
          updateFileProgress(file.id, progress * 0.1) // MD5计算占10%进度
        }
      )

      // 更新MD5到store
      const updatedFile = { ...file, md5 }
      
      updateFileStatus(file.id, UploadStatus.UPLOADING)
      
      // 检查已上传分片
      const uploadedChunks = await uploadService.checkUploadedChunks(
        file.id, 
        md5, 
        file.fileName, 
        file.totalChunks
      )
      
      // 秒传检查：如果所有分片都已上传，直接标记为完成
      if (uploadedChunks.length === file.totalChunks) {
        updateFileStatus(file.id, UploadStatus.COMPLETED)
        updateFileProgress(file.id, 100)
        message.success(`${file.fileName} 文件已存在，秒传完成！`)
        return
      }
      
      // 创建分片
      const chunks = uploadService.createChunks(file.file, file.chunkSize)
      
      // 标记已上传的分片
      uploadedChunks.forEach(index => {
        if (chunks[index]) {
          chunks[index].uploaded = true
        }
      })

      let completedChunks = uploadedChunks.length
      const totalChunks = chunks.length
      
      // 更新初始进度（MD5 10% + 已上传分片进度）
      const initialProgress = 10 + (completedChunks / totalChunks) * 90
      updateFileProgress(file.id, initialProgress)
      
      if (completedChunks > 0) {
        message.info(`${file.fileName} 检测到 ${completedChunks}/${totalChunks} 个分片已上传，继续断点续传`)
      }
      
      // 上传剩余分片
      await uploadService.uploadChunksConcurrently(
        file.id,
        chunks,
        md5,
        file.fileName,
        file.totalChunks,
        UPLOAD_CONSTANTS.MAX_CONCURRENT_UPLOADS,
        (chunkIndex: number, chunkProgress: number) => {
          // 计算总进度 (MD5 10% + 上传 90%)
          const uploadProgress = ((completedChunks + chunkProgress / 100) / totalChunks) * 90
          updateFileProgress(file.id, 10 + uploadProgress)
        },
        (chunkIndex: number) => {
          completedChunks++
          const uploadProgress = (completedChunks / totalChunks) * 90
          updateFileProgress(file.id, 10 + uploadProgress)
        }
      )

      // 完成上传
      await uploadService.completeUpload(file.id, file.fileName, md5, file.totalChunks)
      
      updateFileStatus(file.id, UploadStatus.COMPLETED)
      updateFileProgress(file.id, 100)
      message.success(`文件 ${file.fileName} 上传完成`)

    } catch (error: any) {
      const errorMessage = error.message || '上传失败'
      updateFileError(file.id, errorMessage)
      message.error(`文件 ${file.fileName} 上传失败: ${errorMessage}`)
    }
  }, [updateFileStatus, updateFileProgress, updateFileError])

  // 开始上传
  const handleStartUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      startUpload(fileId)
      await handleUpload(file)
    }
  }, [files, startUpload, handleUpload])

  // 暂停上传
  const handlePauseUpload = useCallback((fileId: string) => {
    uploadService.cancelUpload(fileId)
    pauseUpload(fileId)
  }, [pauseUpload])

  // 恢复上传
  const handleResumeUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      resumeUpload(fileId)
      await handleUpload(file)
    }
  }, [files, resumeUpload, handleUpload])

  // 取消上传
  const handleCancelUpload = useCallback((fileId: string) => {
    uploadService.cancelUpload(fileId)
    cancelUpload(fileId)
  }, [cancelUpload])

  // 重试上传
  const handleRetryUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      retryUpload(fileId)
      await handleUpload(file)
    }
  }, [files, retryUpload, handleUpload])

  // 删除文件
  const handleRemoveFile = useCallback((fileId: string) => {
    uploadService.cancelUpload(fileId)
    removeFile(fileId)
  }, [removeFile])

  // 批量操作
  const handleBatchOperation = useCallback((operation: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择文件')
      return
    }

    switch (operation) {
      case 'start':
        selectedRowKeys.forEach(key => {
          const file = files.find(f => f.id === key)
          if (file && file.status === UploadStatus.WAITING) {
            handleStartUpload(file.id)
          }
        })
        break
      case 'pause':
        selectedRowKeys.forEach(key => {
          const file = files.find(f => f.id === key)
          if (file && file.status === UploadStatus.UPLOADING) {
            handlePauseUpload(file.id)
          }
        })
        break
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`,
          onOk: () => {
            selectedRowKeys.forEach(key => {
              handleRemoveFile(key as string)
            })
            setSelectedRowKeys([])
          }
        })
        break
    }
  }, [selectedRowKeys, files, handleStartUpload, handlePauseUpload, handleRemoveFile])

  // 表格列定义
  const columns: ColumnsType<UploadFile> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (text: string, record: UploadFile) => (
        <Space>
          <FileOutlined />
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => UploadService.formatFileSize(size)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UploadStatus) => {
        const color = UPLOAD_CONSTANTS.STATUS_COLORS[status]
        const statusText = {
          [UploadStatus.WAITING]: '等待中',
          [UploadStatus.HASHING]: '计算MD5',
          [UploadStatus.UPLOADING]: '上传中',
          [UploadStatus.PAUSED]: '已暂停',
          [UploadStatus.COMPLETED]: '已完成',
          [UploadStatus.ERROR]: '上传失败',
          [UploadStatus.CANCELLED]: '已取消'
        }[status]
        
        return <Tag color={color}>{statusText}</Tag>
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 200,
      render: (progress: number, record: UploadFile) => (
        <div>
          <Progress 
            percent={Math.round(progress)} 
            size="small" 
            status={
              record.status === UploadStatus.ERROR ? 'exception' : 
              record.status === UploadStatus.COMPLETED ? 'success' : 'active'
            }
          />
          {record.status === UploadStatus.UPLOADING && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {UploadService.formatSpeed(record.speed)} • {UploadService.formatRemainingTime(record.remainingTime)}
            </div>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record: UploadFile) => (
        <Space>
          {record.status === UploadStatus.WAITING && (
            <Button 
              type="primary" 
              size="small" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartUpload(record.id)}
            >
              开始
            </Button>
          )}
          
          {record.status === UploadStatus.UPLOADING && (
            <Button 
              size="small" 
              icon={<PauseCircleOutlined />}
              onClick={() => handlePauseUpload(record.id)}
            >
              暂停
            </Button>
          )}
          
          {record.status === UploadStatus.PAUSED && (
            <Button 
              type="primary" 
              size="small" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleResumeUpload(record.id)}
            >
              继续
            </Button>
          )}
          
          {record.status === UploadStatus.ERROR && (
            <Button 
              type="primary" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={() => handleRetryUpload(record.id)}
            >
              重试
            </Button>
          )}
          
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveFile(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 服务器状态 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Alert
          message={
            <Space>
              <CloudServerOutlined />
              服务器状态: {serverStatus.message}
            </Space>
          }
          type={serverStatus.online ? 'success' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      </motion.div>

      {/* 统计信息 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总文件数" value={stats.totalFiles} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已完成" value={stats.completedFiles} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="总大小" 
                value={UploadService.formatFileSize(stats.totalSize)} 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="总进度" 
                value={Math.round(stats.totalProgress)} 
                suffix="%" 
                valueStyle={{ color: stats.totalProgress === 100 ? '#52c41a' : '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* 上传区域 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card title="文件上传" style={{ marginBottom: 16 }}>
          <Dragger
            multiple
            showUploadList={false}
            beforeUpload={() => false}
            onChange={(info) => {
              if (info.fileList.length > 0) {
                const files = info.fileList.map(item => item.originFileObj).filter(Boolean) as File[]
                handleFileSelect(files)
              }
            }}
            onDrop={handleDrop}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个或批量上传，支持断点续传功能
            </p>
          </Dragger>
          
          <div style={{ marginTop: 16 }}>
            <Space>
              <Button 
                type="primary" 
                onClick={startAllUploads}
                disabled={!serverStatus.online || files.length === 0}
              >
                全部开始
              </Button>
              <Button 
                onClick={pauseAllUploads}
                disabled={!isUploading}
              >
                全部暂停
              </Button>
              <Button 
                onClick={clearCompleted}
                disabled={files.filter(f => f.status === UploadStatus.COMPLETED).length === 0}
              >
                清除已完成
              </Button>
              <Button 
                type="primary"
                ghost
                onClick={() => {
                  Modal.confirm({
                    title: '清空重新开始',
                    content: '确定要清空所有文件并重新开始吗？',
                    okText: '确认清空',
                    cancelText: '取消',
                    okType: 'danger',
                    onOk: () => {
                      clearAll()
                      message.success('已清空所有文件，可以重新添加文件')
                    }
                  })
                }}
                disabled={files.length === 0}
                icon={<ClearOutlined />}
              >
                清空重新开始
              </Button>
              <Button 
                danger 
                onClick={() => {
                  Modal.confirm({
                    title: '确认清空',
                    content: '确定要清空所有文件吗？',
                    onOk: clearAll
                  })
                }}
                disabled={files.length === 0}
                icon={<ClearOutlined />}
              >
                清空所有
              </Button>
            </Space>
          </div>
        </Card>
      </motion.div>

      {/* 文件列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ flex: 1 }}
      >
        <Card 
          title="文件列表" 
          extra={
            selectedRowKeys.length > 0 && (
              <Space>
                <span>已选择 {selectedRowKeys.length} 项</span>
                <Button size="small" onClick={() => handleBatchOperation('start')}>
                  批量开始
                </Button>
                <Button size="small" onClick={() => handleBatchOperation('pause')}>
                  批量暂停
                </Button>
                <Button size="small" danger onClick={() => handleBatchOperation('delete')}>
                  批量删除
                </Button>
              </Space>
            )
          }
        >
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={files}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
            }}
            scroll={{ y: 400 }}
          />
        </Card>
      </motion.div>
    </div>
  )
}

export default UploadPage 