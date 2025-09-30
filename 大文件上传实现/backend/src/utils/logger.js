const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class Logger {
  constructor() {
    this.logDir = './logs';
    this.initLogDir();
  }

  async initLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  async writeLog(level, message, data = null) {
    const logMessage = this.formatMessage(level, message, data);
    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      await fs.appendFile(logFile, logMessage + '\n');
    } catch (error) {
      console.error('写入日志失败:', error);
    }

    // 控制台输出
    const consoleMessage = `[${new Date().toLocaleString()}] [${level.toUpperCase()}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'info':
        console.info(consoleMessage, data || '');
        break;
      default:
        console.log(consoleMessage, data || '');
    }
  }

  info(message, data) {
    return this.writeLog('info', message, data);
  }

  warn(message, data) {
    return this.writeLog('warn', message, data);
  }

  error(message, data) {
    return this.writeLog('error', message, data);
  }

  debug(message, data) {
    if (config.server.env === 'development') {
      return this.writeLog('debug', message, data);
    }
  }

  async cleanOldLogs() {
    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const retentionMs = config.cleanup.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > retentionMs) {
          await fs.unlink(filePath);
          console.log(`🗑️ 已删除过期日志: ${file}`);
        }
      }
    } catch (error) {
      console.error('清理日志失败:', error);
    }
  }
}

module.exports = new Logger(); 