class UploadController {
  constructor(uploadService) {
    this.uploadService = uploadService;
  }

  /**
   * 健康检查
   */
  async health(req, res, next) {
    try {
      res.json({
        success: true,
        status: 'ok',
        message: '后端服务运行正常',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        node: process.version
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 检查已上传的分片
   */
  async checkChunks(req, res, next) {
    try {
      const { md5, fileName, totalChunks, fileSize } = req.body;
      const fileId = `${md5}_${fileName}`;

      const clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      const result = await this.uploadService.checkUploadedChunks(
        fileId,
        md5,
        fileName,
        parseInt(totalChunks),
        parseInt(fileSize) || 0,
        clientInfo
      );

      // 如果是秒传，返回特殊标识
      // 秒传：直接返回，不进入分片上传流程
      if (result.instantUpload) {
        let fileUrl = result.fileUrl;
        if (fileUrl && (fileUrl.includes('\\') || fileUrl.includes(':'))) {
          const path = require('path');
          fileUrl = `/uploads/${path.basename(fileUrl)}`;
        }
        res.json({
          success: true,
          instantUpload: true,
          fileUrl,
          fileName: result.fileName,
          fileSize: result.fileSize,
          uploadedChunks: result.uploadedChunks,
          data: {
            instantUpload: true,
            fileUrl,
            fileName: result.fileName,
            fileSize: result.fileSize,
            uploadedChunks: result.uploadedChunks
          }
        });
      } else {
        res.json({
          success: true,
          instantUpload: false,
          uploadedChunks: result.uploadedChunks,
          progress: result.progress || 0,
          fromDatabase: result.fromDatabase,
          data: {
            instantUpload: false,
            uploadedChunks: result.uploadedChunks,
            progress: result.progress || 0,
            fromDatabase: result.fromDatabase
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传分片
   */
  async uploadChunk(req, res, next) {
    try {
      const { md5, fileName, chunkIndex, totalChunks, fileSize, chunkMd5 } = req.body;
      const fileId = `${md5}_${fileName}`;

      if (!req.file) {
        return res.status(400).json({ success: false, error: '未接收到文件' });
      }

      const clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      // 保存分片：支持分片MD5校验与幂等上传
      await this.uploadService.saveChunk(
        fileId,
        parseInt(chunkIndex),
        req.file,
        md5,
        fileName,
        parseInt(totalChunks),
        parseInt(fileSize) || 0,
        clientInfo,
        chunkMd5 || null
      );

      const uploadInfo = await this.uploadService.db.getUploadInfo(fileId);
      const uploadedCount = uploadInfo?.uploadedChunks?.length || 0;
      const progress = uploadInfo?.progress || 0;
      const uploadSpeed = uploadInfo?.upload_speed || 0;
      const chunkSize = typeof req.file.size === 'number'
        ? req.file.size
        : (req.file.buffer ? req.file.buffer.length : 0);

      res.json({
        success: true,
        uploaded: uploadedCount,
        total: parseInt(totalChunks),
        progress,
        chunkIndex: parseInt(chunkIndex),
        chunkSize,
        uploadSpeed,
        data: {
          uploaded: uploadedCount,
          total: parseInt(totalChunks),
          progress,
          chunkIndex: parseInt(chunkIndex),
          chunkSize,
          uploadSpeed
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 完成上传
   */
  async completeUpload(req, res, next) {
    try {
      const { md5, fileName, totalChunks } = req.body;
      const fileId = `${md5}_${fileName}`;

      const uploadInfo = await this.uploadService.db.getUploadInfo(fileId);
      const uploadedCount = uploadInfo?.uploadedChunks?.length || 0;
      // 合并前强校验分片数量，避免不完整文件
      if (uploadedCount !== parseInt(totalChunks)) {
        return res.status(400).json({
          success: false,
          error: `文件不完整，已上传 ${uploadedCount}/${totalChunks} 个分片`
        });
      }

      const result = await this.uploadService.mergeChunks(
        fileId,
        fileName,
        md5,
        parseInt(totalChunks)
      );

      const startTime = uploadInfo?.start_time ? new Date(uploadInfo.start_time) : null;
      const uploadTime = startTime ? (new Date() - startTime) : 0;

      res.json({
        success: true,
        fileName,
        size: result.fileSize,
        md5: result.md5,
        path: `/uploads/${fileName}`,
        uploadTime,
        data: {
          fileName,
          fileSize: result.fileSize,
          filePath: `/uploads/${fileName}`,
          md5: result.md5,
          uploadTime
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消上传
   */
  async cancelUpload(req, res, next) {
    try {
      const { fileId } = req.params;

      await this.uploadService.cancelUpload(fileId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(req, res, next) {
    try {
      const { fileId } = req.params;

      await this.uploadService.deleteFile(fileId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除上传任务（兼容旧接口）
   */
  async deleteUploadByName(req, res, next) {
    try {
      const { md5, fileName } = req.params;
      const fileId = `${md5}_${fileName}`;

      await this.uploadService.deleteFile(fileId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取上传进度（兼容旧接口）
   */
  async getUploadStatus(req, res, next) {
    try {
      const { md5, fileName } = req.params;
      const fileId = `${md5}_${fileName}`;

      const uploadInfo = await this.uploadService.db.getUploadInfo(fileId);
      if (!uploadInfo) {
        return res.json({
          uploaded: 0,
          total: 0,
          percentage: 0,
          status: 'not_found'
        });
      }

      const uploaded = uploadInfo.uploadedChunks?.length || 0;
      const total = uploadInfo.total_chunks || 0;
      const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

      res.json({
        uploaded,
        total,
        percentage,
        status: uploadInfo.status || 'uploading',
        startTime: uploadInfo.start_time,
        lastUpdate: uploadInfo.update_time
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取上传历史
   */
  async getUploadHistory(req, res, next) {
    try {
      const { status = 'completed', limit, page = 1, pageSize = 10 } = req.query;

      if (limit) {
        const uploads = await this.uploadService.db.getUploadHistory(status, parseInt(limit));
        return res.json({
          success: true,
          data: uploads
        });
      }

      const result = await this.uploadService.getUploadList(
        parseInt(page),
        parseInt(pageSize),
        status
      );

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 7;
      const stats = await this.uploadService.db.getStats(days);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取服务器统计信息（兼容旧接口）
   */
  async getServerStats(req, res, next) {
    try {
      const dbStats = await this.uploadService.db.getStats(7);
      const stats = {
        activeUploads: dbStats?.current?.activeUploads || 0,
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
      next(error);
    }
  }

  /**
   * 获取日志
   */
  async getLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const logs = await this.uploadService.db.getLogs(limit);
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UploadController; 
