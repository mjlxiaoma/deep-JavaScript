require('dotenv').config();

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // 数据库配置
  database: {
    type: process.env.DATABASE_TYPE || 'mysql',
    mysql: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'upload_system',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      waitForConnections: true,
      queueLimit: 0
    },
    sqlite: {
      path: process.env.SQLITE_DB_PATH || './upload.db'
    }
  },

  // 上传配置
  upload: {
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 5 * 1024 * 1024, // 5MB (优化：从2MB增加) ⚡
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 * 1024, // 10GB
    maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS) || 6, // 6个 (优化：从3增加) ⚡⚡
    allowedExtensions: process.env.ALLOWED_EXTENSIONS 
      ? process.env.ALLOWED_EXTENSIONS.split(',') 
      : null, // null = 允许所有类型
    chunksDir: './chunks',
    uploadsDir: './uploads',
    tempDir: './temp'
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 100,
    maxSize: parseInt(process.env.LOG_MAX_SIZE) || 10 * 1024 * 1024 // 10MB
  },

  // 清理任务配置
  cleanup: {
    enabled: process.env.CLEANUP_ENABLED !== 'false',
    interval: parseInt(process.env.CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24小时
    retentionDays: parseInt(process.env.RETENTION_DAYS) || 7 // 保留7天
  },

  // JWT配置（如果需要用户认证）
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // 最多100个请求
  }
};

module.exports = config; 