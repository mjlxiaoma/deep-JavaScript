const express = require('express');
const multer = require('multer');
const {
  validateCheckChunks,
  validateUploadChunk,
  validateCompleteUpload
} = require('../validators/uploadValidator');

// 配置multer使用内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB per chunk (优化：从10MB增加) ⚡
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

  // 获取日志
  router.get(
    '/logs',
    uploadController.getLogs.bind(uploadController)
  );

  return router;
};

module.exports = createUploadRouter; 