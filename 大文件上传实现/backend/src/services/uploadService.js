const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class UploadService {
  constructor(database) {
    this.db = database;
    this.chunksDir = path.resolve(process.cwd(), config.upload.chunksDir);
    this.uploadsDir = path.resolve(process.cwd(), config.upload.uploadsDir);
  }

  /**
   * 检查已上传的分片
   */
  async checkUploadedChunks(fileId, md5, fileName, totalChunks, fileSize = 0, clientInfo = {}) {
    try {
      // 秒传检测：优先查已完成且MD5一致的文件记录，并确保文件物理存在
      const existingFile = await this.db.findCompletedByMd5(md5);
      
      if (existingFile && existingFile.final_path && existingFile.actual_md5 === md5) {
        try {
          await fs.access(existingFile.final_path);
          logger.info(`⚡ 秒传命中: ${fileName} (MD5: ${md5})`);
          
          // 返回秒传标识和文件信息
          return {
            instantUpload: true,
            fileUrl: `/uploads/${existingFile.file_name}`,
            fileName: existingFile.file_name,
            fileSize: existingFile.file_size,
            uploadedChunks: Array.from({ length: totalChunks }, (_, i) => i) // 所有分片
          };
        } catch {
          logger.warn(`秒传文件不存在，回退到正常上传: ${existingFile.final_path}`);
        }
      }

      // 没有秒传则进入断点续传逻辑：优先数据库，其次文件系统
      let dbInfo = await this.db.getUploadInfo(fileId);
      let uploadedChunks = [];
      let fromDatabase = false;

      if (dbInfo) {
        // 已完成但文件不存在：清理记录，回退为新上传（防止误判“已存在”）
        if (dbInfo.status === 'completed') {
          const finalPath = dbInfo.final_path || dbInfo.filePath;
          let exists = false;
          if (finalPath) {
            try {
              await fs.access(finalPath);
              exists = true;
            } catch {
              exists = false;
            }
          }
          if (!exists) {
            logger.warn(`已完成记录但文件不存在，重置上传: ${fileName}`);
            try {
              await this.db.deleteUpload(fileId);
            } catch {}
            try {
              await fs.rm(path.join(this.chunksDir, fileId), { recursive: true, force: true });
            } catch {}
            dbInfo = null;
          }
        }
      }

      if (dbInfo) {
        // 数据库中有记录，使用数据库数据
        uploadedChunks = dbInfo.uploadedChunks || [];
        fromDatabase = true;
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

      return {
        instantUpload: false,
        uploadedChunks,
        progress: totalChunks > 0 ? Math.round((uploadedChunks.length / totalChunks) * 100) : 0,
        fromDatabase
      };
    } catch (error) {
      logger.error('检查已上传分片失败', error);
      throw error;
    }
  }

  /**
   * 保存分片
   */
  async saveChunk(fileId, chunkIndex, file, md5, fileName, totalChunks, fileSize = 0, clientInfo = {}, chunkMd5 = null) {
    try {
      const chunksPath = path.join(this.chunksDir, fileId);
      await fs.mkdir(chunksPath, { recursive: true });

      const chunkPath = path.join(chunksPath, `chunk_${chunkIndex}`);
      let chunkSize = 0;
      let computedChunkMd5 = null;

      // 幂等处理：分片已存在则校验MD5并直接返回，避免重复写磁盘
      try {
        await fs.access(chunkPath);
        computedChunkMd5 = await new Promise((resolve, reject) => {
          const hash = crypto.createHash('md5');
          const stream = fsSync.createReadStream(chunkPath);
          stream.on('data', data => hash.update(data));
          stream.on('end', () => resolve(hash.digest('hex')));
          stream.on('error', reject);
        });

        if (chunkMd5 && computedChunkMd5 !== chunkMd5) {
          const err = new Error('分片MD5校验失败');
          err.statusCode = 400;
          throw err;
        }

        const stats = await fs.stat(chunkPath);
        chunkSize = stats.size;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      if (chunkSize > 0) {
        // 记录分片并返回（避免重复写入）
        let uploadInfo = await this.db.getUploadInfo(fileId);
        if (!uploadInfo) {
          await this.db.startUpload(fileId, fileName, fileSize || 0, md5, parseInt(totalChunks), clientInfo);
        }
        await this.db.recordChunk(fileId, parseInt(chunkIndex), chunkSize, computedChunkMd5);
        logger.info(`分片已存在: ${fileName} - chunk ${chunkIndex}`);
        return { success: true, chunkPath, skipped: true };
      }

      // 兼容两种上传方式：内存buffer或磁盘临时文件
      if (file && file.buffer) {
        await fs.writeFile(chunkPath, file.buffer);
        chunkSize = file.buffer.length;
        computedChunkMd5 = crypto.createHash('md5').update(file.buffer).digest('hex');
      } else if (file && file.path) {
        await fs.rename(file.path, chunkPath);
        if (typeof file.size === 'number') {
          chunkSize = file.size;
        } else {
          const stats = await fs.stat(chunkPath);
          chunkSize = stats.size;
        }
        computedChunkMd5 = await new Promise((resolve, reject) => {
          const hash = crypto.createHash('md5');
          const stream = fsSync.createReadStream(chunkPath);
          stream.on('data', data => hash.update(data));
          stream.on('end', () => resolve(hash.digest('hex')));
          stream.on('error', reject);
        });
      } else {
        throw new Error('无效的分片文件');
      }

      // 分片MD5校验（可选）：不一致立即拒绝
      if (chunkMd5 && computedChunkMd5 && chunkMd5 !== computedChunkMd5) {
        const err = new Error('分片MD5校验失败');
        err.statusCode = 400;
        throw err;
      }

      // 确保数据库中有上传记录
      let uploadInfo = await this.db.getUploadInfo(fileId);
      if (!uploadInfo) {
        await this.db.startUpload(fileId, fileName, fileSize || 0, md5, parseInt(totalChunks), clientInfo);
      }

      // 记录分片
      await this.db.recordChunk(fileId, parseInt(chunkIndex), chunkSize, computedChunkMd5);

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

      try {
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
      } catch (error) {
        try {
          await fs.unlink(finalPath);
        } catch {}
        throw error;
      }

      // 获取文件大小
      const stats = await fs.stat(finalPath);
      
      // 计算合并后文件MD5（流式，避免大文件占用内存）
      const actualMd5 = await new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fsSync.createReadStream(finalPath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });

      // 最终MD5校验失败：删除文件并标记失败
      if (md5 && actualMd5 !== md5) {
        try {
          await fs.unlink(finalPath);
        } catch {}
        await this.db.failUpload(fileId, 'MD5校验失败');
        const err = new Error('MD5校验失败');
        err.statusCode = 400;
        throw err;
      }
      
      // 更新数据库状态
      await this.db.completeUpload(fileId, finalPath, actualMd5, stats.size);

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
        fileSize: stats.size,
        md5: actualMd5
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
      const finalPath = uploadInfo.final_path || uploadInfo.filePath;
      if (finalPath) {
        try {
          await fs.unlink(finalPath);
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
