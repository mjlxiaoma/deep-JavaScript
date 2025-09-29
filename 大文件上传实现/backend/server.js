const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// 根据配置选择数据库
const databaseType = process.env.DATABASE_TYPE || 'mysql';
let UploadDatabase;

if (databaseType === 'mysql') {
  UploadDatabase = require('./database-mysql');
  console.log('📊 使用MySQL数据库');
} else {
  UploadDatabase = require('./database');
  console.log('📊 使用SQLite数据库');
}

const app = express();
const port = process.env.PORT || 3000;

// 配置中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 配置CORS - 支持多个前端
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vue3版本
    'http://localhost:4174',  // React版本
    'http://localhost:3000',  // 开发环境
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4174'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// 配置multer用于处理文件上传
const upload = multer({ 
  dest: path.join(__dirname, 'temp'),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldSize: 10 * 1024 * 1024 // 10MB for form fields
  }
});

// 初始化数据库
let db;

async function initDatabase() {
  try {
    db = new UploadDatabase();
    
    // 如果是MySQL，等待初始化完成
    if (databaseType === 'mysql') {
      // MySQL的构造函数是异步的，需要等待
      console.log('📊 等待MySQL数据库初始化...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 给初始化一些时间
      
      // 测试连接
      const healthCheck = await db.healthCheck();
      if (!healthCheck) {
        throw new Error('MySQL连接测试失败');
      }
      console.log('✅ MySQL数据库连接成功');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 兼容性：保留内存存储作为备份（可选）
const uploadStatus = new Map();

// 确保必要的目录存在
async function ensureDirectories() {
  const dirs = ['temp', 'uploads', 'chunks'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 创建目录: ${dir}`);
    }
  }
}

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '后端服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    node: process.version
  });
});

// 检查已上传的chunks
app.post('/api/check-chunks', async (req, res) => {
  try {
    const { md5, fileName, totalChunks, fileSize } = req.body;
    
    if (!md5 || !fileName || !totalChunks) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: md5, fileName, totalChunks' 
      });
    }

    const fileId = `${md5}_${fileName}`;
    
    // 首先检查数据库中的上传记录
    let dbInfo = db.getUploadInfo(fileId);
    let uploadedChunks = [];
    let progress = 0;
    
    if (dbInfo) {
      // 数据库中有记录，使用数据库数据
      uploadedChunks = dbInfo.uploadedChunks || [];
      progress = uploadedChunks.length;
      
      console.log(`📊 从数据库加载: ${fileName} - ${progress}/${totalChunks} chunks`);
    } else {
      // 数据库中没有记录，检查文件系统（兼容性）
      const chunksDir = path.join(__dirname, 'chunks', fileId);
      
      try {
        const files = await fs.readdir(chunksDir);
        uploadedChunks = files
          .filter(file => file.startsWith('chunk_'))
          .map(file => parseInt(file.split('_')[1]))
          .filter(num => !isNaN(num))
          .sort((a, b) => a - b);
        
        progress = uploadedChunks.length;
        
        console.log(`📁 从文件系统检查: ${fileName} - ${progress}/${totalChunks} chunks`);
        
        // 如果文件系统中有数据但数据库没有，创建数据库记录
        if (uploadedChunks.length > 0) {
          const clientInfo = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          };
          
          db.startUpload(fileId, fileName, fileSize || 0, md5, parseInt(totalChunks), clientInfo);
          
          // 批量记录已存在的chunks
          for (const chunkIndex of uploadedChunks) {
            try {
              const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
              const stats = await fs.stat(chunkPath);
              db.recordChunk(fileId, chunkIndex, stats.size);
            } catch (err) {
              console.warn(`⚠️ 无法获取chunk ${chunkIndex} 信息:`, err.message);
            }
          }
        }
      } catch (error) {
        // 目录不存在，说明还没有上传任何chunk
        uploadedChunks = [];
        progress = 0;
        console.log(`🆕 新文件: ${fileName}`);
      }
    }
    
    // 同步内存状态（兼容性）
    uploadStatus.set(fileId, {
      md5,
      fileName,
      totalChunks: parseInt(totalChunks),
      uploadedChunks: new Set(uploadedChunks),
      lastCheck: new Date(),
      status: uploadedChunks.length === parseInt(totalChunks) ? 'completed' : 'partial'
    });
    
    res.json({ 
      success: true,
      uploadedChunks,
      progress: Math.round((uploadedChunks.length / totalChunks) * 100),
      fromDatabase: !!dbInfo
    });
    
  } catch (error) {
    console.error('❌ 检查chunks失败:', error);
    db.log('error', `检查chunks失败: ${error.message}`, `${req.body.md5}_${req.body.fileName}`);
    res.status(500).json({ 
      success: false, 
      error: '检查失败',
      details: error.message 
    });
  }
});

// 上传单个chunk
app.post('/api/upload-chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { chunkIndex, md5, fileName, totalChunks, fileSize } = req.body;
    
    if (!req.file || chunkIndex === undefined || !md5 || !fileName || !totalChunks) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数或文件' 
      });
    }

    const fileId = `${md5}_${fileName}`;
    const chunksDir = path.join(__dirname, 'chunks', fileId);
    
    // 确保chunks目录存在
    await fs.mkdir(chunksDir, { recursive: true });
    
    // 移动chunk文件到正确位置
    const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
    await fs.rename(req.file.path, chunkPath);
    
    // 获取chunk文件大小
    const chunkStats = await fs.stat(chunkPath);
    const chunkSize = chunkStats.size;
    
    // 确保数据库中有上传记录
    let dbInfo = db.getUploadInfo(fileId);
    if (!dbInfo) {
      const clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };
      db.startUpload(fileId, fileName, fileSize || 0, md5, parseInt(totalChunks), clientInfo);
    }
    
    // 记录chunk到数据库
    db.recordChunk(fileId, parseInt(chunkIndex), chunkSize);
    
    // 更新内存状态（兼容性）
    let status = uploadStatus.get(fileId);
    if (!status) {
      status = {
        md5,
        fileName,
        totalChunks: parseInt(totalChunks),
        uploadedChunks: new Set(),
        startTime: new Date(),
        status: 'uploading'
      };
    }
    
    status.uploadedChunks.add(parseInt(chunkIndex));
    status.lastUpdate = new Date();
    
    if (status.uploadedChunks.size === status.totalChunks) {
      status.status = 'ready_to_merge';
    }
    
    uploadStatus.set(fileId, status);
    
    // 从数据库获取最新进度
    const updatedInfo = db.getUploadInfo(fileId);
    const dbProgress = updatedInfo ? updatedInfo.progress : 0;
    const memProgress = Math.round((status.uploadedChunks.size / status.totalChunks) * 100);
    
    console.log(`📤 上传chunk: ${fileName} [${chunkIndex}] - 数据库进度 ${dbProgress}%, 内存进度 ${memProgress}%`);
    
    res.json({ 
      success: true, 
      uploaded: status.uploadedChunks.size,
      total: status.totalChunks,
      progress: dbProgress,
      chunkIndex: parseInt(chunkIndex),
      chunkSize,
      uploadSpeed: updatedInfo?.upload_speed || 0
    });
    
  } catch (error) {
    console.error('❌ 上传chunk失败:', error);
    
    const fileId = `${req.body.md5}_${req.body.fileName}`;
    db.log('error', `上传chunk失败: ${error.message}`, fileId);
    
    // 清理临时文件
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: '上传失败',
      details: error.message 
    });
  }
});

// 完成上传，合并所有chunks
app.post('/api/complete-upload', async (req, res) => {
  try {
    const { md5, fileName, totalChunks } = req.body;
    
    if (!md5 || !fileName || !totalChunks) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }

    const fileId = `${md5}_${fileName}`;
    const chunksDir = path.join(__dirname, 'chunks', fileId);
    const finalPath = path.join(__dirname, 'uploads', fileName);
    
    // 检查所有chunks是否都已上传（优先使用数据库检查）
    const dbInfo = db.getUploadInfo(fileId);
    const status = uploadStatus.get(fileId);
    
    let uploadedCount = 0;
    if (dbInfo && dbInfo.uploadedChunks) {
      uploadedCount = dbInfo.uploadedChunks.length;
    } else if (status) {
      uploadedCount = status.uploadedChunks.size;
    }
    
    if (uploadedCount !== parseInt(totalChunks)) {
      return res.status(400).json({ 
        success: false, 
        error: `文件不完整，已上传 ${uploadedCount}/${totalChunks} 个分片` 
      });
    }
    
    console.log(`🔄 开始合并文件: ${fileName}`);
    
    // 确保uploads目录存在
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    
    // 合并chunks
    const writeStream = require('fs').createWriteStream(finalPath);
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunksDir, `chunk_${i}`);
        
        try {
          const chunkData = await fs.readFile(chunkPath);
          writeStream.write(chunkData);
        } catch (chunkError) {
          throw new Error(`读取分片 ${i} 失败: ${chunkError.message}`);
        }
      }
      
      writeStream.end();
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // 验证文件完整性
      const fileBuffer = await fs.readFile(finalPath);
      const actualMd5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
      
      console.log(`🔍 MD5验证: 期望=${md5}, 实际=${actualMd5}`);
      
      // 完成数据库记录
      db.completeUpload(fileId, finalPath, actualMd5, fileBuffer.length);
      
      // 清理临时chunks
      try {
        const chunkFiles = await fs.readdir(chunksDir);
        for (const file of chunkFiles) {
          await fs.unlink(path.join(chunksDir, file));
        }
        await fs.rmdir(chunksDir);
        console.log(`🗑️ 清理临时文件: ${fileId}`);
      } catch (cleanupError) {
        console.warn('⚠️ 清理chunks失败:', cleanupError.message);
      }
      
      // 更新内存状态（兼容性）
      if (status) {
        status.status = 'completed';
        status.completedAt = new Date();
        status.finalPath = finalPath;
        status.actualMd5 = actualMd5;
        
        // 5分钟后清理状态（防止内存泄漏）
        setTimeout(() => {
          uploadStatus.delete(fileId);
        }, 5 * 60 * 1000);
      }
      
      console.log(`✅ 文件上传完成: ${fileName} (${fileBuffer.length} bytes)`);
      
      // 计算上传时间
      const uploadTime = dbInfo && dbInfo.start_time ? 
        new Date() - new Date(dbInfo.start_time) : 
        (status ? new Date() - status.startTime : 0);
      
      res.json({ 
        success: true, 
        fileName,
        size: fileBuffer.length,
        md5: actualMd5,
        path: `/uploads/${fileName}`,
        uploadTime
      });
      
    } catch (mergeError) {
      // 合并失败，清理不完整的文件
      try {
        await fs.unlink(finalPath);
      } catch {}
      throw mergeError;
    }
    
  } catch (error) {
    console.error('❌ 完成上传失败:', error);
    
    // 标记上传失败
    const fileId = `${md5}_${fileName}`;
    db.failUpload(fileId, error.message);
    
    res.status(500).json({ 
      success: false, 
      error: '合并文件失败',
      details: error.message 
    });
  }
});

// 获取上传进度
app.get('/api/upload-status/:md5/:fileName', (req, res) => {
  const { md5, fileName } = req.params;
  const fileId = `${md5}_${fileName}`;
  const status = uploadStatus.get(fileId);
  
  if (!status) {
    return res.json({ 
      uploaded: 0, 
      total: 0, 
      percentage: 0,
      status: 'not_found'
    });
  }
  
  const uploaded = status.uploadedChunks.size;
  const total = status.totalChunks;
  const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  
  res.json({ 
    uploaded, 
    total, 
    percentage,
    status: status.status,
    startTime: status.startTime,
    lastUpdate: status.lastUpdate
  });
});

// 删除上传任务
app.delete('/api/upload/:md5/:fileName', async (req, res) => {
  try {
    const { md5, fileName } = req.params;
    const fileId = `${md5}_${fileName}`;
    const chunksDir = path.join(__dirname, 'chunks', fileId);
    
    // 清理chunks
    try {
      const chunkFiles = await fs.readdir(chunksDir);
      for (const file of chunkFiles) {
        await fs.unlink(path.join(chunksDir, file));
      }
      await fs.rmdir(chunksDir);
    } catch (error) {
      // 目录可能不存在
      console.log('清理chunks目录失败:', error.message);
    }
    
    // 清理状态
    uploadStatus.delete(fileId);
    
    console.log(`🗑️ 删除上传任务: ${fileName}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ 删除上传失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '删除失败',
      details: error.message 
    });
  }
});

// 获取服务器统计信息
app.get('/api/stats', (req, res) => {
  try {
    const dbStats = db.getStats(7); // 获取7天的统计
    
    const stats = {
      activeUploads: uploadStatus.size,
      totalMemoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      database: dbStats,
      timestamp: new Date()
    };
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败',
      details: error.message
    });
  }
});

// 获取数据库统计详情
app.get('/api/database/stats', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = db.getStats(days);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取数据库统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取数据库统计失败',
      details: error.message
    });
  }
});

// 获取系统日志
app.get('/api/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = db.getLogs(limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取日志失败',
      details: error.message
    });
  }
});

// 获取上传历史
app.get('/api/uploads/history', async (req, res) => {
  try {
    const status = req.query.status || 'completed';
    const limit = parseInt(req.query.limit) || 50;
    
    let uploads;
    if (databaseType === 'mysql') {
      uploads = await db.getUploadHistory(status, limit);
    } else {
      if (!db.statements) db.prepareStatements();
      uploads = db.statements.getUploadsByStatus.all(status).slice(0, limit);
    }
    
    res.json({
      success: true,
      data: uploads
    });
  } catch (error) {
    console.error('获取上传历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取上传历史失败',
      details: error.message
    });
  }
});

// 静态文件服务（可选）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'API端点不存在',
    path: req.originalUrl 
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('💥 服务器错误:', error);
  
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请联系管理员'
  });
});

// 优雅关闭处理
process.on('SIGTERM', async () => {
  console.log('📴 接收到SIGTERM信号，开始优雅关闭...');
  
  // 清理资源
  uploadStatus.clear();
  
  // 关闭数据库连接
  if (db) {
    db.close();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 接收到SIGINT信号，开始优雅关闭...');
  
  // 清理资源
  uploadStatus.clear();
  
  // 关闭数据库连接
  if (db) {
    db.close();
  }
  
  process.exit(0);
});

// 定期清理任务
function startCleanupTasks() {
  // 每天凌晨2点执行清理
  const cleanupInterval = 24 * 60 * 60 * 1000; // 24小时
  
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 2) { // 凌晨2点
      console.log('🧹 开始定期清理任务...');
      db.cleanup();
    }
  }, 60 * 60 * 1000); // 每小时检查一次
  
  console.log('⏰ 定期清理任务已启动（每天凌晨2点执行）');
}

// 启动服务器
async function startServer() {
  try {
    await ensureDirectories();
    
    // 初始化数据库
    await initDatabase();
    
    // 启动清理任务
    startCleanupTasks();
    
    app.listen(port, () => {
      console.log('🚀========================================');
      console.log('🚀 断点续传后端服务器启动成功！');
      console.log('🚀========================================');
      console.log(`📍 服务地址: http://localhost:${port}`);
      console.log(`📍 健康检查: http://localhost:${port}/api/health`);
      console.log(`📍 服务统计: http://localhost:${port}/api/stats`);
      console.log(`📍 数据库统计: http://localhost:${port}/api/database/stats`);
      console.log(`📍 系统日志: http://localhost:${port}/api/logs`);
      console.log(`📍 上传历史: http://localhost:${port}/api/uploads/history`);
      console.log('');
      console.log('🎯 支持的前端:');
      console.log('   • Vue3版本: http://localhost:5173');
      console.log('   • React版本: http://localhost:4174');
      console.log('');
      console.log('✨ 功能特性:');
      console.log('   • 🔄 大文件分块上传');
      console.log('   • 🔒 MD5校验确保文件完整性');
      console.log('   • ⏸️ 断点续传支持');
      console.log('   • 🌐 跨域支持');
      console.log('   • 📊 实时进度监控');
      console.log('   • 🛡️ 错误处理和重试');
      console.log('🚀========================================');
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app; 