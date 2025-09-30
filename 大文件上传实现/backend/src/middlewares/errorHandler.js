const logger = require('../utils/logger');
const Response = require('../utils/response');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  logger.error('全局错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Multer错误处理
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return Response.error(res, '文件大小超出限制', 400);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return Response.error(res, '意外的文件字段', 400);
    }
    return Response.error(res, `文件上传错误: ${err.message}`, 400);
  }

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return Response.error(res, '数据已存在', 409);
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return Response.unauthorized(res, 'Token无效');
  }
  if (err.name === 'TokenExpiredError') {
    return Response.unauthorized(res, 'Token已过期');
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return Response.validationError(res, err.details);
  }

  // 默认服务器错误
  return Response.serverError(res, err);
};

/**
 * 404错误处理
 */
const notFoundHandler = (req, res) => {
  Response.notFound(res, `路由 ${req.method} ${req.url} 不存在`);
};

module.exports = {
  errorHandler,
  notFoundHandler
}; 