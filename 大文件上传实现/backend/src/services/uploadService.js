const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class UploadService {
  constructor(database) {
    this.db = database;
    this.chunksDir = config.upload.chunksDir;
    this.uploadsDir = config.upload.uploadsDir;
  }

  /**
   * 检查已上传的分片
   */
  async checkUploadedChunks(fileId, md5, fileName, totalChunks, fileSize = 0, clientInfo = {}) {
    try {
      // 首先检查数据库中的上传记录
      let dbInfo = await this.db.getUploadInfo(fileId);
      let uploadedChunks = [];

      if (dbInfo) {
        // 数据库中有记录，使用数据库数据
        uploadedChunks = dbInfo.uploadedChunks || [];
        logger.info(`从数据库加载: ${fileName} - ${uploadedChunks.length}/${totalChunks} chunks`);
      } else {
        // 数据库中没有记录，检查文件系统（兼容性）
        const chunksPath = path.join(this.chunksDir, fileId);
        
        try {
          const files = await fs.readdir(chunksPath);
          uploadedChunks = files
            .filter(file => file.startsWith('chunk_'))
            .map(file => parseInt(file.split('_')[1]))
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);

          logger.info(`从文件系统检查: ${fileName} - ${uploadedChunks.length}/${totalChunks} chunks`);

          // 如果文件系统中有数据但数据库没有，创建数据库记录
          if (uploadedChunks.length > 0) {
            await this.db.startUpload(fileId, fileName, fileSize, md5, parseInt(totalChunks), clientInfo);
            
            // 批量记录已存在的chunks
            for (const chunkIndex of uploadedChunks) {
              try {
                const chunkPath = path.join(chunksPath, `chunk_${chunkIndex}`);
                const stats = await fs.stat(chunkPath);
                await this.db.recordChunk(fileId, chunkIndex, stats.size);
              } catch (err) {
                logger.warn(`无法获取chunk ${chunkIndex} 信息`, err);
              }
            }
          }
        } catch (error) {
          // 目录不存在，说明还没有上传任何chunk
          uploadedChunks = [];
          logger.info(`新文件: ${fileName}`);
        }
      }

      return uploadedChunks;
    } catch (error) {
      logger.error('检查已上传分片失败', error);
      throw error;
    }
  }

  /**
   * 保存分片
   */
  async saveChunk(fileId, chunkIndex, chunkBuffer, md5, fileName, totalChunks, clientInfo = {}) {
    try {
      const chunksPath = path.join(this.chunksDir, fileId);
      await fs.mkdir(chunksPath, { recursive: true });

      const chunkPath = path.join(chunksPath, `chunk_${chunkIndex}`);
      await fs.writeFile(chunkPath, chunkBuffer);

      // 确保数据库中有上传记录
      let uploadInfo = await this.db.getUploadInfo(fileId);
      if (!uploadInfo) {
        await this.db.startUpload(fileId, fileName, 0, md5, parseInt(totalChunks), clientInfo);
      }

      // 记录分片
      await this.db.recordChunk(fileId, parseInt(chunkIndex), chunkBuffer.length);

      logger.info(`分片保存成功: ${fileName} - chunk ${chunkIndex}`);
      
      return { success: true, chunkPath };
    } catch (error) {
      logger.error('保存分片失败', error);
      throw error;
    }
  }

  /**
   * 合并分片
   */
  async mergeChunks(fileId, fileName, md5, totalChunks) {
    try {
      const chunksPath = path.join(this.chunksDir, fileId);
      const finalPath = path.join(this.uploadsDir, fileName);

      await fs.mkdir(this.uploadsDir, { recursive: true });

      // 创建写入流
      const writeStream = require('fs').createWriteStream(finalPath);

      // 按顺序写入分片
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunksPath, `chunk_${i}`);
        const chunkBuffer = await fs.readFile(chunkPath);
        writeStream.write(chunkBuffer);
      }

      writeStream.end();

      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // 获取文件大小
      const stats = await fs.stat(finalPath);
      
      // 更新数据库状态
      await this.db.completeUpload(fileId, finalPath, stats.size);

      // 清理分片目录（可选）
      try {
        await fs.rm(chunksPath, { recursive: true, force: true });
        logger.info(`已清理分片目录: ${chunksPath}`);
      } catch (error) {
        logger.warn('清理分片目录失败', error);
      }

      logger.info(`文件合并成功: ${fileName}`);

      return {
        success: true,
        filePath: finalPath,
        fileSize: stats.size
      };
    } catch (error) {
      logger.error('合并分片失败', error);
      throw error;
    }
  }

  /**
   * 取消上传
   */
  async cancelUpload(fileId) {
    try {
      const chunksPath = path.join(this.chunksDir, fileId);
      
      // 删除分片目录
      await fs.rm(chunksPath, { recursive: true, force: true });
      
      // 更新数据库状态
      await this.db.updateUploadStatus(fileId, 'cancelled');

      logger.info(`上传已取消: ${fileId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('取消上传失败', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId) {
    try {
      const uploadInfo = await this.db.getUploadInfo(fileId);
      
      if (!uploadInfo) {
        throw new Error('文件不存在');
      }

      // 删除合并后的文件
      if (uploadInfo.filePath) {
        try {
          await fs.unlink(uploadInfo.filePath);
        } catch (error) {
          logger.warn('删除文件失败', error);
        }
      }

      // 删除分片目录
      const chunksPath = path.join(this.chunksDir, fileId);
      await fs.rm(chunksPath, { recursive: true, force: true });

      // 从数据库删除记录
      await this.db.deleteUpload(fileId);

      logger.info(`文件已删除: ${fileId}`);

      return { success: true };
    } catch (error) {
      logger.error('删除文件失败', error);
      throw error;
    }
  }

  /**
   * 获取上传列表
   */
  async getUploadList(page = 1, pageSize = 10, status = null) {
    try {
      const result = await this.db.getUploadList(page, pageSize, status);
      return result;
    } catch (error) {
      logger.error('获取上传列表失败', error);
      throw error;
    }
  }

  /**
   * 清理过期上传
   */
  async cleanupOldUploads(retentionDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.db.cleanupOldUploads(cutoffDate);
      
      logger.info(`清理完成: 删除了 ${result.deleted} 个过期上传记录`);

      return result;
    } catch (error) {
      logger.error('清理过期上传失败', error);
      throw error;
    }
  }
}

module.exports = UploadService; 