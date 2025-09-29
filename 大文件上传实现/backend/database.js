const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class UploadDatabase {
  constructor() {
    // 确保data目录存在
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 初始化数据库
    this.db = new Database(path.join(dataDir, 'uploads.db'));
    this.db.pragma('journal_mode = WAL'); // 提高并发性能
    
    this.initTables();
    console.log('📊 数据库初始化完成');
  }

  // 初始化数据表
  initTables() {
    // 上传文件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        md5 TEXT NOT NULL,
        total_chunks INTEGER NOT NULL,
        uploaded_chunks INTEGER DEFAULT 0,
        status TEXT DEFAULT 'uploading',
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        complete_time DATETIME NULL,
        final_path TEXT NULL,
        actual_md5 TEXT NULL,
        upload_speed REAL DEFAULT 0,
        client_ip TEXT NULL,
        user_agent TEXT NULL
      )
    `);

    // 分片上传记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_size INTEGER NOT NULL,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        chunk_md5 TEXT NULL,
        UNIQUE(file_id, chunk_index),
        FOREIGN KEY (file_id) REFERENCES uploads(file_id)
      )
    `);

    // 上传统计表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS upload_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        total_uploads INTEGER DEFAULT 0,
        successful_uploads INTEGER DEFAULT 0,
        failed_uploads INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        total_chunks INTEGER DEFAULT 0
      )
    `);

    // 系统日志表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        file_id TEXT NULL,
        details TEXT NULL
      )
    `);

    // 创建索引以提高查询性能
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_uploads_file_id ON uploads(file_id);
      CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
      CREATE INDEX IF NOT EXISTS idx_uploads_start_time ON uploads(start_time);
      CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_index ON chunks(file_id, chunk_index);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_file_id ON logs(file_id);
    `);
  }

  // 预编译SQL语句以提高性能
  prepareStatements() {
    this.statements = {
      // 上传相关
      insertUpload: this.db.prepare(`
        INSERT OR REPLACE INTO uploads 
        (file_id, file_name, file_size, md5, total_chunks, client_ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      
      updateUploadProgress: this.db.prepare(`
        UPDATE uploads 
        SET uploaded_chunks = ?, update_time = CURRENT_TIMESTAMP, upload_speed = ?
        WHERE file_id = ?
      `),
      
      completeUpload: this.db.prepare(`
        UPDATE uploads 
        SET status = 'completed', complete_time = CURRENT_TIMESTAMP, 
            final_path = ?, actual_md5 = ?, file_size = ?
        WHERE file_id = ?
      `),
      
      failUpload: this.db.prepare(`
        UPDATE uploads 
        SET status = 'failed', update_time = CURRENT_TIMESTAMP
        WHERE file_id = ?
      `),
      
      getUpload: this.db.prepare(`
        SELECT * FROM uploads WHERE file_id = ?
      `),
      
      getUploadsByStatus: this.db.prepare(`
        SELECT * FROM uploads WHERE status = ? ORDER BY start_time DESC
      `),
      
      // 分片相关
      insertChunk: this.db.prepare(`
        INSERT OR IGNORE INTO chunks 
        (file_id, chunk_index, chunk_size, chunk_md5)
        VALUES (?, ?, ?, ?)
      `),
      
      getUploadedChunks: this.db.prepare(`
        SELECT chunk_index FROM chunks WHERE file_id = ? ORDER BY chunk_index
      `),
      
      deleteChunks: this.db.prepare(`
        DELETE FROM chunks WHERE file_id = ?
      `),
      
      // 统计相关
      updateDailyStats: this.db.prepare(`
        INSERT OR REPLACE INTO upload_stats 
        (date, total_uploads, successful_uploads, failed_uploads, total_size, total_chunks)
        VALUES (?, 
          COALESCE((SELECT total_uploads FROM upload_stats WHERE date = ?), 0) + 1,
          COALESCE((SELECT successful_uploads FROM upload_stats WHERE date = ?), 0) + ?,
          COALESCE((SELECT failed_uploads FROM upload_stats WHERE date = ?), 0) + ?,
          COALESCE((SELECT total_size FROM upload_stats WHERE date = ?), 0) + ?,
          COALESCE((SELECT total_chunks FROM upload_stats WHERE date = ?), 0) + ?
        )
      `),
      
      getDailyStats: this.db.prepare(`
        SELECT * FROM upload_stats WHERE date = ?
      `),
      
      getStatsRange: this.db.prepare(`
        SELECT * FROM upload_stats 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date DESC
      `),
      
      // 日志相关
      insertLog: this.db.prepare(`
        INSERT INTO logs (level, message, file_id, details)
        VALUES (?, ?, ?, ?)
      `),
      
      getLogs: this.db.prepare(`
        SELECT * FROM logs 
        WHERE timestamp >= datetime('now', '-7 days')
        ORDER BY timestamp DESC 
        LIMIT ?
      `),
      
      // 清理相关
      cleanOldLogs: this.db.prepare(`
        DELETE FROM logs 
        WHERE timestamp < datetime('now', '-30 days')
      `),
      
      cleanFailedUploads: this.db.prepare(`
        DELETE FROM uploads 
        WHERE status = 'failed' AND update_time < datetime('now', '-1 days')
      `)
    };
  }

  // 开始新上传
  startUpload(fileId, fileName, fileSize, md5, totalChunks, clientInfo = {}) {
    try {
      if (!this.statements) this.prepareStatements();
      
      this.statements.insertUpload.run(
        fileId, fileName, fileSize || 0, md5, totalChunks,
        clientInfo.ip || null, clientInfo.userAgent || null
      );
      
      this.log('info', `开始上传: ${fileName}`, fileId);
      return true;
    } catch (error) {
      this.log('error', `创建上传记录失败: ${error.message}`, fileId);
      return false;
    }
  }

  // 记录分片上传
  recordChunk(fileId, chunkIndex, chunkSize, chunkMd5 = null) {
    try {
      if (!this.statements) this.prepareStatements();
      
      this.statements.insertChunk.run(fileId, chunkIndex, chunkSize, chunkMd5);
      
      // 更新上传进度
      const uploadedChunks = this.getUploadedChunks(fileId);
      const upload = this.statements.getUpload.get(fileId);
      
      if (upload) {
        const progress = uploadedChunks.length;
        const speed = this.calculateUploadSpeed(upload, progress);
        this.statements.updateUploadProgress.run(progress, speed, fileId);
      }
      
      return true;
    } catch (error) {
      this.log('error', `记录分片失败: ${error.message}`, fileId);
      return false;
    }
  }

  // 获取已上传的分片
  getUploadedChunks(fileId) {
    try {
      if (!this.statements) this.prepareStatements();
      
      const chunks = this.statements.getUploadedChunks.all(fileId);
      return chunks.map(chunk => chunk.chunk_index);
    } catch (error) {
      this.log('error', `获取分片列表失败: ${error.message}`, fileId);
      return [];
    }
  }

  // 完成上传
  completeUpload(fileId, finalPath, actualMd5, fileSize) {
    const transaction = this.db.transaction(() => {
      try {
        if (!this.statements) this.prepareStatements();
        
        // 更新上传状态
        this.statements.completeUpload.run(finalPath, actualMd5, fileSize, fileId);
        
        // 更新每日统计
        const today = new Date().toISOString().split('T')[0];
        this.statements.updateDailyStats.run(
          today, today, today, 1, today, 0, today, fileSize, today, 0
        );
        
        this.log('info', `上传完成: ${finalPath}`, fileId);
        return true;
      } catch (error) {
        this.log('error', `完成上传失败: ${error.message}`, fileId);
        throw error;
      }
    });
    
    return transaction();
  }

  // 标记上传失败
  failUpload(fileId, reason = '') {
    try {
      if (!this.statements) this.prepareStatements();
      
      this.statements.failUpload.run(fileId);
      
      // 更新每日统计
      const today = new Date().toISOString().split('T')[0];
      this.statements.updateDailyStats.run(
        today, today, today, 0, today, 1, today, 0, today, 0
      );
      
      this.log('error', `上传失败: ${reason}`, fileId);
      return true;
    } catch (error) {
      this.log('error', `标记失败状态出错: ${error.message}`, fileId);
      return false;
    }
  }

  // 获取上传信息
  getUploadInfo(fileId) {
    try {
      if (!this.statements) this.prepareStatements();
      
      const upload = this.statements.getUpload.get(fileId);
      if (!upload) return null;
      
      const uploadedChunks = this.getUploadedChunks(fileId);
      
      return {
        ...upload,
        uploadedChunks,
        progress: Math.round((uploadedChunks.length / upload.total_chunks) * 100)
      };
    } catch (error) {
      this.log('error', `获取上传信息失败: ${error.message}`, fileId);
      return null;
    }
  }

  // 计算上传速度
  calculateUploadSpeed(upload, currentChunks) {
    try {
      const startTime = new Date(upload.start_time);
      const now = new Date();
      const elapsedSeconds = (now - startTime) / 1000;
      
      if (elapsedSeconds < 1) return 0;
      
      const chunksPerSecond = currentChunks / elapsedSeconds;
      return Math.round(chunksPerSecond * 100) / 100; // 保留2位小数
    } catch {
      return 0;
    }
  }

  // 获取统计信息
  getStats(days = 7) {
    try {
      if (!this.statements) this.prepareStatements();
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const stats = this.statements.getStatsRange.all(startDate, endDate);
      
      // 获取当前状态
      const activeUploads = this.statements.getUploadsByStatus.all('uploading');
      const completedToday = this.statements.getDailyStats.get(endDate);
      
      return {
        daily: stats,
        current: {
          activeUploads: activeUploads.length,
          completedToday: completedToday?.successful_uploads || 0,
          failedToday: completedToday?.failed_uploads || 0
        }
      };
    } catch (error) {
      this.log('error', `获取统计信息失败: ${error.message}`);
      return { daily: [], current: { activeUploads: 0, completedToday: 0, failedToday: 0 } };
    }
  }

  // 记录日志
  log(level, message, fileId = null, details = null) {
    try {
      if (!this.statements) this.prepareStatements();
      
      this.statements.insertLog.run(level, message, fileId, details);
      console.log(`📊 [${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error('数据库日志记录失败:', error);
    }
  }

  // 获取日志
  getLogs(limit = 100) {
    try {
      if (!this.statements) this.prepareStatements();
      return this.statements.getLogs.all(limit);
    } catch (error) {
      console.error('获取日志失败:', error);
      return [];
    }
  }

  // 清理旧数据
  cleanup() {
    const transaction = this.db.transaction(() => {
      try {
        if (!this.statements) this.prepareStatements();
        
        const oldLogs = this.statements.cleanOldLogs.run();
        const failedUploads = this.statements.cleanFailedUploads.run();
        
        console.log(`🧹 清理完成: 删除 ${oldLogs.changes} 条旧日志, ${failedUploads.changes} 个失败上传`);
        
        this.log('info', `定期清理: 日志${oldLogs.changes}条, 失败上传${failedUploads.changes}个`);
      } catch (error) {
        console.error('清理数据失败:', error);
      }
    });
    
    transaction();
  }

  // 关闭数据库
  close() {
    try {
      this.db.close();
      console.log('📊 数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库失败:', error);
    }
  }
}

module.exports = UploadDatabase; 