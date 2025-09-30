const config = require('../config');

/**
 * 验证文件扩展名
 */
const validateFileExtension = (fileName) => {
  if (!config.upload.allowedExtensions) {
    return { valid: true };
  }

  const ext = fileName.split('.').pop().toLowerCase();
  if (!config.upload.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      message: `不支持的文件类型: .${ext}，允许的类型: ${config.upload.allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * 验证检查分片请求
 */
const validateCheckChunks = (req, res, next) => {
  const { md5, fileName, totalChunks, fileSize } = req.body;
  const errors = [];

  if (!md5 || typeof md5 !== 'string') {
    errors.push({ field: 'md5', message: 'MD5哈希值必须是字符串' });
  }

  if (!fileName || typeof fileName !== 'string') {
    errors.push({ field: 'fileName', message: '文件名必须是字符串' });
  } else {
    const extValidation = validateFileExtension(fileName);
    if (!extValidation.valid) {
      errors.push({ field: 'fileName', message: extValidation.message });
    }
  }

  if (!totalChunks || !Number.isInteger(parseInt(totalChunks)) || totalChunks <= 0) {
    errors.push({ field: 'totalChunks', message: '总分片数必须是正整数' });
  }

  if (fileSize && (!Number.isInteger(parseInt(fileSize)) || fileSize < 0)) {
    errors.push({ field: 'fileSize', message: '文件大小必须是非负整数' });
  }

  if (fileSize && fileSize > config.upload.maxFileSize) {
    errors.push({ 
      field: 'fileSize', 
      message: `文件大小超过限制 (${(config.upload.maxFileSize / 1024 / 1024 / 1024).toFixed(2)}GB)` 
    });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: '参数验证失败',
      errors
    });
  }

  next();
};

/**
 * 验证上传分片请求
 */
const validateUploadChunk = (req, res, next) => {
  const { md5, fileName, chunkIndex, totalChunks } = req.body;
  const errors = [];

  if (!req.file) {
    errors.push({ field: 'chunk', message: '缺少分片文件' });
  }

  if (!md5 || typeof md5 !== 'string') {
    errors.push({ field: 'md5', message: 'MD5哈希值必须是字符串' });
  }

  if (!fileName || typeof fileName !== 'string') {
    errors.push({ field: 'fileName', message: '文件名必须是字符串' });
  }

  if (chunkIndex === undefined || !Number.isInteger(parseInt(chunkIndex)) || chunkIndex < 0) {
    errors.push({ field: 'chunkIndex', message: '分片索引必须是非负整数' });
  }

  if (!totalChunks || !Number.isInteger(parseInt(totalChunks)) || totalChunks <= 0) {
    errors.push({ field: 'totalChunks', message: '总分片数必须是正整数' });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: '参数验证失败',
      errors
    });
  }

  next();
};

/**
 * 验证完成上传请求
 */
const validateCompleteUpload = (req, res, next) => {
  const { md5, fileName, totalChunks } = req.body;
  const errors = [];

  if (!md5 || typeof md5 !== 'string') {
    errors.push({ field: 'md5', message: 'MD5哈希值必须是字符串' });
  }

  if (!fileName || typeof fileName !== 'string') {
    errors.push({ field: 'fileName', message: '文件名必须是字符串' });
  }

  if (!totalChunks || !Number.isInteger(parseInt(totalChunks)) || totalChunks <= 0) {
    errors.push({ field: 'totalChunks', message: '总分片数必须是正整数' });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: '参数验证失败',
      errors
    });
  }

  next();
};

module.exports = {
  validateCheckChunks,
  validateUploadChunk,
  validateCompleteUpload,
  validateFileExtension
}; 