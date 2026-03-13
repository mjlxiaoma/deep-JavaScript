const express = require('express');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const {
  validateCheckChunks,
  validateUploadChunk,
  validateCompleteUpload
} = require('../validators/uploadValidator');

// 配置multer使用磁盘存储，避免大分片占用内存
const tempDir = path.resolve(process.cwd(), config.upload.tempDir);
const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: config.upload.maxFileSize,
    fieldSize: 10 * 1024 * 1024
  }
});

const createUploadRouter = (uploadController) => {
  const router = express.Router();

  // 健康检查
  router.get('/health', uploadController.health.bind(uploadController));

  // 检查已上传的分片
  router.post(
    '/check-chunks',
    validateCheckChunks,
    uploadController.checkChunks.bind(uploadController)
  );

  // 上传分片
  router.post(
    '/upload-chunk',
    upload.single('chunk'),
    validateUploadChunk,
    uploadController.uploadChunk.bind(uploadController)
  );

  // 完成上传
  router.post(
    '/complete-upload',
    validateCompleteUpload,
    uploadController.completeUpload.bind(uploadController)
  );

  // 获取上传进度
  router.get(
    '/upload-status/:md5/:fileName',
    uploadController.getUploadStatus.bind(uploadController)
  );

  // 删除上传任务（兼容旧接口）
  router.delete(
    '/upload/:md5/:fileName',
    uploadController.deleteUploadByName.bind(uploadController)
  );

  // 取消上传
  router.delete(
    '/cancel/:fileId',
    uploadController.cancelUpload.bind(uploadController)
  );

  // 删除文件
  router.delete(
    '/delete/:fileId',
    uploadController.deleteFile.bind(uploadController)
  );

  // 获取上传历史
  router.get(
    '/uploads/history',
    uploadController.getUploadHistory.bind(uploadController)
  );

  // 获取统计信息
  router.get(
    '/database/stats',
    uploadController.getStats.bind(uploadController)
  );

  // 服务器统计（兼容旧接口）
  router.get(
    '/stats',
    uploadController.getServerStats.bind(uploadController)
  );

  // 获取日志
  router.get(
    '/logs',
    uploadController.getLogs.bind(uploadController)
  );

  return router;
};

module.exports = createUploadRouter; 
