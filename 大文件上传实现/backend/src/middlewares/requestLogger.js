const logger = require('../utils/logger');

/**
 * 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 保存原始的res.json方法
  const originalJson = res.json.bind(res);
  
  // 重写res.json方法以记录响应
  res.json = function(body) {
    res.locals.responseBody = body;
    return originalJson(body);
  };

  // 响应结束时记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      ...(req.body && Object.keys(req.body).length > 0 && { body: req.body }),
      ...(req.query && Object.keys(req.query).length > 0 && { query: req.query })
    };

    if (res.statusCode >= 500) {
      logger.error('请求失败', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('请求错误', logData);
    } else {
      logger.info('请求成功', logData);
    }
  });

  next();
};

module.exports = requestLogger; 