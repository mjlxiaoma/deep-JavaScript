const Response = require('../utils/response');
const logger = require('../utils/logger');

class UploadController {
  constructor(uploadService) {
    this.uploadService = uploadService;
  }

  /**
   * 健康检查
   */
  async health(req, res, next) {
    try {
      Response.success(res, {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }, '服务正常运行');
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

      const uploadedChunks = await this.uploadService.checkUploadedChunks(
        fileId,
        md5,
        fileName,
        parseInt(totalChunks),
        parseInt(fileSize) || 0,
        clientInfo
      );

      Response.success(res, { uploadedChunks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传分片
   */
  async uploadChunk(req, res, next) {
    try {
      const { md5, fileName, chunkIndex, totalChunks } = req.body;
      const fileId = `${md5}_${fileName}`;

      if (!req.file) {
        return Response.error(res, '未接收到文件');
      }

      const clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      await this.uploadService.saveChunk(
        fileId,
        parseInt(chunkIndex),
        req.file.buffer,
        md5,
        fileName,
        parseInt(totalChunks),
        clientInfo
      );

      Response.success(res, {
        chunkIndex: parseInt(chunkIndex),
        fileId
      }, '分片上传成功');
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

      const result = await this.uploadService.mergeChunks(
        fileId,
        fileName,
        md5,
        parseInt(totalChunks)
      );

      Response.success(res, result, '文件上传完成');
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

      Response.success(res, null, '上传已取消');
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

      Response.success(res, null, '文件已删除');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取上传历史
   */
  async getUploadHistory(req, res, next) {
    try {
      const { page = 1, pageSize = 10, status } = req.query;

      const result = await this.uploadService.getUploadList(
        parseInt(page),
        parseInt(pageSize),
        status
      );

      Response.paginate(res, result.data, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(req, res, next) {
    try {
      const stats = await this.uploadService.db.getStats();
      Response.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取日志
   */
  async getLogs(req, res, next) {
    try {
      const { page = 1, pageSize = 50, level } = req.query;

      const logs = await this.uploadService.db.getLogs(
        parseInt(page),
        parseInt(pageSize),
        level
      );

      Response.paginate(res, logs.data, logs.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UploadController; 