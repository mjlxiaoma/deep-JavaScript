const mysql = require('mysql2/promise');
require('dotenv').config();

class MySQLUploadDatabase {
  constructor() {
    this.pool = null;
    this.initDatabase();
  }

  // 初始化数据库连接
  async initDatabase() {
    try {
      // 创建连接池
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'file_upload',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        charset: 'utf8mb4'
      });

      console.log('📊 MySQL连接池创建成功');
      
      // 测试连接
      const connection = await this.pool.getConnection();
      console.log(`📊 MySQL连接测试成功 - 数据库: ${process.env.DB_NAME || 'file_upload'}`);
      connection.release();

      // 初始化表结构
      await this.initTables();
      
    } catch (error) {
      console.error('❌ MySQL数据库初始化失败:', error);
      
      if (error.code === 'ER_BAD_DB_ERROR') {
        console.log('💡 尝试创建数据库...');
        await this.createDatabase();
      } else {
        throw error;
      }
    }
  }

  // 创建数据库
  async createDatabase() {
    try {
      const tempPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        charset: 'utf8mb4'
      });

      const connection = await tempPool.getConnection();
      
      const dbName = process.env.DB_NAME || 'file_upload';
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      
      console.log(`📊 数据库 ${dbName} 创建成功`);
      
      connection.release();
      await tempPool.end();
      
      // 重新初始化
      await this.initDatabase();
      
    } catch (error) {
      console.error('❌ 创建数据库失败:', error);
      throw error;
    }
  }

  // 初始化数据表
  async initTables() {
    try {
      const connection = await this.pool.getConnection();

      // 上传文件表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS uploads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          file_id VARCHAR(255) UNIQUE NOT NULL,
          file_name VARCHAR(500) NOT NULL,
          file_size BIGINT DEFAULT 0,
          md5 VARCHAR(32) NOT NULL,
          total_chunks INT NOT NULL,
          uploaded_chunks INT DEFAULT 0,
          status ENUM('uploading', 'completed', 'failed') DEFAULT 'uploading',
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          complete_time TIMESTAMP NULL,
          final_path VARCHAR(1000) NULL,
          actual_md5 VARCHAR(32) NULL,
          upload_speed DECIMAL(10,2) DEFAULT 0,
          client_ip VARCHAR(45) NULL,
          user_agent TEXT NULL,
          INDEX idx_file_id (file_id),
          INDEX idx_status (status),
          INDEX idx_start_time (start_time),
          INDEX idx_md5 (md5)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 分片上传记录表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chunks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          file_id VARCHAR(255) NOT NULL,
          chunk_index INT NOT NULL,
          chunk_size INT NOT NULL,
          upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          chunk_md5 VARCHAR(32) NULL,
          UNIQUE KEY unique_chunk (file_id, chunk_index),
          INDEX idx_file_id (file_id),
          INDEX idx_chunk_index (chunk_index),
          FOREIGN KEY (file_id) REFERENCES uploads(file_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 上传统计表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS upload_stats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATE UNIQUE NOT NULL,
          total_uploads INT DEFAULT 0,
          successful_uploads INT DEFAULT 0,
          failed_uploads INT DEFAULT 0,
          total_size BIGINT DEFAULT 0,
          total_chunks INT DEFAULT 0,
          INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 系统日志表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          level ENUM('info', 'warn', 'error') NOT NULL,
          message TEXT NOT NULL,
          file_id VARCHAR(255) NULL,
          details TEXT NULL,
          INDEX idx_timestamp (timestamp),
          INDEX idx_level (level),
          INDEX idx_file_id (file_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      connection.release();
      console.log('📊 MySQL数据表初始化完成');

    } catch (error) {
      console.error('❌ 创建数据表失败:', error);
      throw error;
    }
  }

  // 开始新上传
  async startUpload(fileId, fileName, fileSize, md5, totalChunks, clientInfo = {}) {
    try {
      const connection = await this.pool.getConnection();
      
      await connection.execute(`
        INSERT INTO uploads 
        (file_id, file_name, file_size, md5, total_chunks, client_ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        file_size = VALUES(file_size),
        total_chunks = VALUES(total_chunks),
        update_time = CURRENT_TIMESTAMP
      `, [fileId, fileName, fileSize || 0, md5, totalChunks, clientInfo.ip || null, clientInfo.userAgent || null]);

      connection.release();
      
      await this.log('info', `开始上传: ${fileName}`, fileId);
      return true;
    } catch (error) {
      await this.log('error', `创建上传记录失败: ${error.message}`, fileId);
      return false;
    }
  }

  // 记录分片上传
  async recordChunk(fileId, chunkIndex, chunkSize, chunkMd5 = null) {
    try {
      const connection = await this.pool.getConnection();
      
      // 插入分片记录
      await connection.execute(`
        INSERT IGNORE INTO chunks 
        (file_id, chunk_index, chunk_size, chunk_md5)
        VALUES (?, ?, ?, ?)
      `, [fileId, chunkIndex, chunkSize, chunkMd5]);

      // 更新上传进度
      const [uploadedResult] = await connection.execute(`
        SELECT COUNT(*) as count FROM chunks WHERE file_id = ?
      `, [fileId]);
      
      const uploadedCount = uploadedResult[0].count;
      
      // 获取上传开始时间用于计算速度
      const [uploadResult] = await connection.execute(`
        SELECT start_time, total_chunks FROM uploads WHERE file_id = ?
      `, [fileId]);
      
      if (uploadResult.length > 0) {
        const { start_time, total_chunks } = uploadResult[0];
        const speed = this.calculateUploadSpeed(start_time, uploadedCount);
        
        await connection.execute(`
          UPDATE uploads 
          SET uploaded_chunks = ?, upload_speed = ?, update_time = CURRENT_TIMESTAMP
          WHERE file_id = ?
        `, [uploadedCount, speed, fileId]);
      }

      connection.release();
      return true;
    } catch (error) {
      await this.log('error', `记录分片失败: ${error.message}`, fileId);
      return false;
    }
  }

  // 获取已上传的分片
  async getUploadedChunks(fileId) {
    try {
      const connection = await this.pool.getConnection();
      
      const [results] = await connection.execute(`
        SELECT chunk_index FROM chunks WHERE file_id = ? ORDER BY chunk_index
      `, [fileId]);
      
      connection.release();
      return results.map(row => row.chunk_index);
    } catch (error) {
      await this.log('error', `获取分片列表失败: ${error.message}`, fileId);
      return [];
    }
  }

  // 完成上传
  async completeUpload(fileId, finalPath, actualMd5, fileSize) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 更新上传状态
      await connection.execute(`
        UPDATE uploads 
        SET status = 'completed', complete_time = CURRENT_TIMESTAMP, 
            final_path = ?, actual_md5 = ?, file_size = ?
        WHERE file_id = ?
      `, [finalPath, actualMd5, fileSize, fileId]);

      // 更新每日统计
      const today = new Date().toISOString().split('T')[0];
      await connection.execute(`
        INSERT INTO upload_stats 
        (date, total_uploads, successful_uploads, failed_uploads, total_size, total_chunks)
        VALUES (?, 1, 1, 0, ?, 0)
        ON DUPLICATE KEY UPDATE
        total_uploads = total_uploads + 1,
        successful_uploads = successful_uploads + 1,
        total_size = total_size + ?
      `, [today, fileSize, fileSize]);

      await connection.commit();
      connection.release();
      
      await this.log('info', `上传完成: ${finalPath}`, fileId);
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      await this.log('error', `完成上传失败: ${error.message}`, fileId);
      throw error;
    }
  }

  // 标记上传失败
  async failUpload(fileId, reason = '') {
    try {
      const connection = await this.pool.getConnection();
      
      await connection.execute(`
        UPDATE uploads 
        SET status = 'failed', update_time = CURRENT_TIMESTAMP
        WHERE file_id = ?
      `, [fileId]);

      // 更新每日统计
      const today = new Date().toISOString().split('T')[0];
      await connection.execute(`
        INSERT INTO upload_stats 
        (date, total_uploads, successful_uploads, failed_uploads, total_size, total_chunks)
        VALUES (?, 1, 0, 1, 0, 0)
        ON DUPLICATE KEY UPDATE
        total_uploads = total_uploads + 1,
        failed_uploads = failed_uploads + 1
      `, [today]);

      connection.release();
      
      await this.log('error', `上传失败: ${reason}`, fileId);
      return true;
    } catch (error) {
      await this.log('error', `标记失败状态出错: ${error.message}`, fileId);
      return false;
    }
  }

  // 获取上传信息
  async getUploadInfo(fileId) {
    try {
      const connection = await this.pool.getConnection();
      
      const [uploadResults] = await connection.execute(`
        SELECT * FROM uploads WHERE file_id = ?
      `, [fileId]);
      
      if (uploadResults.length === 0) {
        connection.release();
        return null;
      }
      
      const upload = uploadResults[0];
      const uploadedChunks = await this.getUploadedChunks(fileId);
      
      connection.release();
      
      return {
        ...upload,
        uploadedChunks,
        progress: Math.round((uploadedChunks.length / upload.total_chunks) * 100)
      };
    } catch (error) {
      await this.log('error', `获取上传信息失败: ${error.message}`, fileId);
      return null;
    }
  }

  // 计算上传速度
  calculateUploadSpeed(startTime, currentChunks) {
    try {
      const now = new Date();
      const elapsedSeconds = (now - new Date(startTime)) / 1000;
      
      if (elapsedSeconds < 1) return 0;
      
      const chunksPerSecond = currentChunks / elapsedSeconds;
      return Math.round(chunksPerSecond * 100) / 100; // 保留2位小数
    } catch {
      return 0;
    }
  }

  // 获取统计信息
  async getStats(days = 7) {
    try {
      const connection = await this.pool.getConnection();
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const [dailyStats] = await connection.execute(`
        SELECT * FROM upload_stats 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date DESC
      `, [startDate, endDate]);
      
      // 获取当前状态
      const [activeResults] = await connection.execute(`
        SELECT COUNT(*) as count FROM uploads WHERE status = 'uploading'
      `);
      
      const [todayResults] = await connection.execute(`
        SELECT successful_uploads, failed_uploads FROM upload_stats WHERE date = ?
      `, [endDate]);
      
      connection.release();
      
      const todayStats = todayResults[0] || { successful_uploads: 0, failed_uploads: 0 };
      
      return {
        daily: dailyStats,
        current: {
          activeUploads: activeResults[0].count,
          completedToday: todayStats.successful_uploads,
          failedToday: todayStats.failed_uploads
        }
      };
    } catch (error) {
      await this.log('error', `获取统计信息失败: ${error.message}`);
      return { daily: [], current: { activeUploads: 0, completedToday: 0, failedToday: 0 } };
    }
  }

  // 记录日志
  async log(level, message, fileId = null, details = null) {
    try {
      const connection = await this.pool.getConnection();
      
      await connection.execute(`
        INSERT INTO logs (level, message, file_id, details)
        VALUES (?, ?, ?, ?)
      `, [level, message, fileId, details]);
      
      connection.release();
      console.log(`📊 [${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error('MySQL日志记录失败:', error);
    }
  }

  // 获取日志
  async getLogs(limit = 100) {
    try {
      const connection = await this.pool.getConnection();
      
      const [results] = await connection.execute(`
        SELECT * FROM logs 
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [limit]);
      
      connection.release();
      return results;
    } catch (error) {
      console.error('获取日志失败:', error);
      return [];
    }
  }

  // 获取上传历史
  async getUploadHistory(status = 'completed', limit = 50) {
    try {
      const connection = await this.pool.getConnection();
      
      const [results] = await connection.execute(`
        SELECT * FROM uploads 
        WHERE status = ?
        ORDER BY start_time DESC 
        LIMIT ?
      `, [status, limit]);
      
      connection.release();
      return results;
    } catch (error) {
      console.error('获取上传历史失败:', error);
      return [];
    }
  }

  // 清理旧数据
  async cleanup() {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 清理30天前的日志
      const [oldLogs] = await connection.execute(`
        DELETE FROM logs 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      // 清理1天前的失败上传记录
      const [failedUploads] = await connection.execute(`
        DELETE FROM uploads 
        WHERE status = 'failed' AND update_time < DATE_SUB(NOW(), INTERVAL 1 DAY)
      `);

      await connection.commit();
      connection.release();
      
      console.log(`🧹 清理完成: 删除 ${oldLogs.affectedRows} 条旧日志, ${failedUploads.affectedRows} 个失败上传`);
      
      await this.log('info', `定期清理: 日志${oldLogs.affectedRows}条, 失败上传${failedUploads.affectedRows}个`);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('清理数据失败:', error);
    }
  }

  // 关闭数据库连接池
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('📊 MySQL连接池已关闭');
      }
    } catch (error) {
      console.error('关闭MySQL连接失败:', error);
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      const connection = await this.pool.getConnection();
      const [results] = await connection.execute('SELECT 1 as health');
      connection.release();
      return results[0].health === 1;
    } catch (error) {
      console.error('MySQL健康检查失败:', error);
      return false;
    }
  }
}

module.exports = MySQLUploadDatabase; 