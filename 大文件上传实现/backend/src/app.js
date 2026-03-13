const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const MySQLUploadDatabase = require('../database-mysql');
const UploadService = require('./services/uploadService');
const UploadController = require('./controllers/uploadController');
const createUploadRouter = require('./routes/upload');

class App {
  constructor() {
    this.app = express();
    this.db = null;
    this.uploadService = null;
    this.uploadController = null;
  }

  /**
   * 初始化数据库
   */
  async initDatabase() {
    try {
      this.db = new MySQLUploadDatabase();

      // 等待数据库就绪（MySQL异步初始化）
      if (this.db && typeof this.db.healthCheck === 'function') {
        let ready = false;
        for (let i = 0; i < 10; i++) {
          ready = await this.db.healthCheck();
          if (ready) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!ready) {
          throw new Error('数据库连接测试失败');
        }
      }

      logger.info('数据库初始化成功');
      return true;
    } catch (error) {
      logger.error('数据库初始化失败', error);
      throw error;
    }
  }

  /**
   * 初始化服务
   */
  initServices() {
    this.uploadService = new UploadService(this.db);
    this.uploadController = new UploadController(this.uploadService);
    logger.info('服务初始化成功');
  }

  /**
   * 配置中间件
   */
  setupMiddlewares() {
    // CORS配置
    this.app.use(cors(config.cors));

    // 解析JSON和URL编码的请求体
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // 请求日志中间件
    this.app.use(requestLogger);

    logger.info('中间件配置成功');
  }

  /**
   * 配置路由
   */
  setupRoutes() {
    // API路由
    const uploadRouter = createUploadRouter(this.uploadController);
    this.app.use('/api', uploadRouter);

    // 静态文件服务（可选）
    this.app.use('/uploads', express.static(path.resolve(process.cwd(), config.upload.uploadsDir)));

    // 404处理
    this.app.use(notFoundHandler);

    // 错误处理
    this.app.use(errorHandler);

    logger.info('路由配置成功');
  }

  /**
   * 启动清理任务
   */
  startCleanupTasks() {
    if (config.cleanup.enabled) {
      // 定期清理过期上传
      setInterval(async () => {
        try {
          await this.uploadService.cleanupOldUploads(config.cleanup.retentionDays);
          await logger.cleanOldLogs();
        } catch (error) {
          logger.error('清理任务失败', error);
        }
      }, config.cleanup.interval);

      logger.info(`清理任务已启动，每 ${config.cleanup.interval / 1000 / 60 / 60} 小时执行一次`);
    }
  }

  /**
   * 初始化应用
   */
  async initialize() {
    try {
      // 确保必要目录存在
      await this.ensureDirectories();

      // 初始化数据库
      await this.initDatabase();

      // 初始化服务
      this.initServices();

      // 配置中间件
      this.setupMiddlewares();

      // 配置路由
      this.setupRoutes();

      // 启动清理任务
      this.startCleanupTasks();

      logger.info('应用初始化完成');
      return this.app;
    } catch (error) {
      logger.error('应用初始化失败', error);
      throw error;
    }
  }

  /**
   * 确保必要目录存在
   */
  async ensureDirectories() {
    const dirs = [
      config.upload.tempDir,
      config.upload.uploadsDir,
      config.upload.chunksDir,
      './logs'
    ];

    for (const dir of dirs) {
      const dirPath = path.resolve(process.cwd(), dir);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
        logger.info(`创建目录: ${dirPath}`);
      }
    }
  }

  /**
   * 启动服务器
   */
  async start() {
    try {
      await this.initialize();

      const server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info(`🚀 服务器已启动`);
        logger.info(`📍 地址: http://${config.server.host}:${config.server.port}`);
        logger.info(`🌍 环境: ${config.server.env}`);
        logger.info(`💾 数据库: ${config.database.type}`);
      });

      // 优雅关闭
      process.on('SIGTERM', () => this.gracefulShutdown(server));
      process.on('SIGINT', () => this.gracefulShutdown(server));

      return server;
    } catch (error) {
      logger.error('服务器启动失败', error);
      process.exit(1);
    }
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown(server) {
    logger.info('正在关闭服务器...');

    server.close(() => {
      logger.info('HTTP服务器已关闭');
    });

    if (this.db && this.db.close) {
      await this.db.close();
      logger.info('数据库连接已关闭');
    }

    process.exit(0);
  }
}

module.exports = App; 
