# 📊 数据库功能文档

## 🎯 概述

本项目使用 SQLite 数据库来持久化存储上传记录、进度跟踪、统计信息和系统日志，实现真正的断点续传和数据持久化。

## 🗄️ 数据库结构

### 1. 上传文件表 (uploads)

存储上传文件的基本信息和状态。

```sql
CREATE TABLE uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT UNIQUE NOT NULL,          -- 文件唯一标识 (md5_filename)
  file_name TEXT NOT NULL,               -- 原始文件名
  file_size INTEGER DEFAULT 0,           -- 文件大小（字节）
  md5 TEXT NOT NULL,                     -- 文件MD5哈希
  total_chunks INTEGER NOT NULL,         -- 总分片数
  uploaded_chunks INTEGER DEFAULT 0,     -- 已上传分片数
  status TEXT DEFAULT 'uploading',       -- 状态: uploading/completed/failed
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  complete_time DATETIME NULL,
  final_path TEXT NULL,                  -- 最终文件路径
  actual_md5 TEXT NULL,                  -- 实际文件MD5（验证用）
  upload_speed REAL DEFAULT 0,           -- 上传速度（chunks/秒）
  client_ip TEXT NULL,                   -- 客户端IP
  user_agent TEXT NULL                   -- 用户代理
);
```

### 2. 分片记录表 (chunks)

记录每个分片的上传信息。

```sql
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT NOT NULL,                 -- 关联文件ID
  chunk_index INTEGER NOT NULL,          -- 分片索引
  chunk_size INTEGER NOT NULL,           -- 分片大小
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  chunk_md5 TEXT NULL,                   -- 分片MD5（可选）
  UNIQUE(file_id, chunk_index),
  FOREIGN KEY (file_id) REFERENCES uploads(file_id)
);
```

### 3. 统计信息表 (upload_stats)

按日期统计上传数据。

```sql
CREATE TABLE upload_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,             -- 日期 (YYYY-MM-DD)
  total_uploads INTEGER DEFAULT 0,       -- 总上传数
  successful_uploads INTEGER DEFAULT 0,  -- 成功上传数
  failed_uploads INTEGER DEFAULT 0,      -- 失败上传数
  total_size INTEGER DEFAULT 0,          -- 总上传大小
  total_chunks INTEGER DEFAULT 0         -- 总分片数
);
```

### 4. 系统日志表 (logs)

记录系统操作日志。

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL,                   -- 日志级别: info/warn/error
  message TEXT NOT NULL,                 -- 日志消息
  file_id TEXT NULL,                     -- 相关文件ID
  details TEXT NULL                      -- 详细信息
);
```

## 🚀 功能特性

### ✅ 断点续传支持

- **持久化进度**：即使服务器重启，上传进度也不会丢失
- **智能恢复**：自动检测已上传的分片，从断点继续
- **状态同步**：数据库和内存状态实时同步

### 📈 统计分析

- **实时统计**：活跃上传数、完成数、失败数
- **历史数据**：按天统计上传量、成功率等
- **性能监控**：上传速度、耗时分析

### 📝 日志系统

- **操作日志**：记录所有关键操作
- **错误追踪**：详细的错误信息和堆栈
- **自动清理**：定期清理旧日志，防止磁盘占用过多

### 🔧 自动维护

- **定期清理**：每天凌晨2点自动清理过期数据
- **数据一致性**：事务保证数据一致性
- **性能优化**：索引优化查询性能

## 📡 新增API接口

### 1. 数据库统计 `/api/database/stats`

获取数据库统计信息。

```http
GET /api/database/stats?days=7
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "daily": [
      {
        "date": "2024-01-01",
        "total_uploads": 10,
        "successful_uploads": 8,
        "failed_uploads": 2,
        "total_size": 1073741824
      }
    ],
    "current": {
      "activeUploads": 3,
      "completedToday": 8,
      "failedToday": 1
    }
  }
}
```

### 2. 系统日志 `/api/logs`

获取系统操作日志。

```http
GET /api/logs?limit=100
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "timestamp": "2024-01-01T10:00:00.000Z",
      "level": "info",
      "message": "开始上传: example.zip",
      "file_id": "abc123_example.zip",
      "details": null
    }
  ]
}
```

### 3. 上传历史 `/api/uploads/history`

获取上传历史记录。

```http
GET /api/uploads/history?status=completed&limit=50
```

**参数：**
- `status`: 过滤状态 (uploading/completed/failed)
- `limit`: 返回数量限制

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "file_id": "abc123_example.zip",
      "file_name": "example.zip",
      "file_size": 1048576,
      "status": "completed",
      "start_time": "2024-01-01T10:00:00.000Z",
      "complete_time": "2024-01-01T10:05:00.000Z",
      "upload_speed": 2.5
    }
  ]
}
```

### 4. 增强的服务器统计 `/api/stats`

现在包含数据库统计信息。

```json
{
  "success": true,
  "activeUploads": 3,
  "totalMemoryUsage": {...},
  "uptime": 3600,
  "database": {
    "daily": [...],
    "current": {...}
  }
}
```

## 🛠️ 安装和配置

### 1. 安装数据库依赖

```bash
# 运行安装脚本
install-database.bat

# 或手动安装
npm install sqlite3 better-sqlite3
```

### 2. 自动初始化

数据库会在服务器启动时自动初始化：

- 创建 `data/` 目录
- 创建 `uploads.db` 数据库文件
- 初始化所有表结构
- 创建性能优化索引

### 3. 配置选项

**数据库文件位置：** `backend/data/uploads.db`

**WAL模式：** 启用以提高并发性能

**自动清理：** 每天凌晨2点执行

## 🔧 高级功能

### 数据库方法

```javascript
const db = new UploadDatabase();

// 开始新上传
db.startUpload(fileId, fileName, fileSize, md5, totalChunks, clientInfo);

// 记录分片
db.recordChunk(fileId, chunkIndex, chunkSize);

// 获取上传信息
const info = db.getUploadInfo(fileId);

// 完成上传
db.completeUpload(fileId, finalPath, actualMd5, fileSize);

// 记录日志
db.log('info', '操作消息', fileId);

// 获取统计
const stats = db.getStats(7); // 7天统计

// 清理数据
db.cleanup();
```

### 事务支持

```javascript
const transaction = db.db.transaction(() => {
  // 多个数据库操作
  db.recordChunk(fileId, chunkIndex, chunkSize);
  db.updateProgress(fileId);
});

transaction(); // 原子执行
```

## 🚦 状态说明

### 上传状态

- **uploading**: 正在上传中
- **completed**: 上传完成
- **failed**: 上传失败

### 日志级别

- **info**: 一般信息
- **warn**: 警告信息
- **error**: 错误信息

## 📈 性能优化

### 索引策略

```sql
-- 文件ID索引（最常用）
CREATE INDEX idx_uploads_file_id ON uploads(file_id);

-- 状态索引（用于统计）
CREATE INDEX idx_uploads_status ON uploads(status);

-- 时间索引（用于清理）
CREATE INDEX idx_uploads_start_time ON uploads(start_time);

-- 分片查询索引
CREATE INDEX idx_chunks_file_id ON chunks(file_id);
```

### 预编译语句

使用预编译SQL语句提高执行效率：

```javascript
this.statements = {
  insertUpload: this.db.prepare(`INSERT OR REPLACE INTO uploads ...`),
  updateProgress: this.db.prepare(`UPDATE uploads SET ...`),
  // ... 更多预编译语句
};
```

## 🔒 数据安全

### 备份建议

```bash
# 备份数据库
cp data/uploads.db data/uploads.db.backup

# 或使用SQLite备份
sqlite3 data/uploads.db ".backup data/uploads_backup.db"
```

### 数据恢复

```bash
# 从备份恢复
cp data/uploads.db.backup data/uploads.db
```

## 🐛 故障排除

### 常见问题

1. **数据库锁定**
   - 检查是否有多个进程访问数据库
   - 确保正确关闭数据库连接

2. **编译错误**
   - 安装 Python 和 C++ 编译工具
   - 运行: `npm install --global windows-build-tools`

3. **权限问题**
   - 确保 `data/` 目录有写权限
   - 检查磁盘空间

### 调试技巧

```javascript
// 启用SQLite调试
process.env.DEBUG = 'sqlite3:*';

// 查看WAL文件
ls -la data/
```

## 📚 扩展功能

### 自定义清理策略

```javascript
// 修改database.js中的清理逻辑
cleanOldLogs: this.db.prepare(`
  DELETE FROM logs 
  WHERE timestamp < datetime('now', '-30 days')
`),
```

### 添加新统计维度

```javascript
// 在database.js中添加新的统计方法
getUploadsBySize() {
  return this.db.prepare(`
    SELECT file_size, COUNT(*) as count 
    FROM uploads 
    WHERE status = 'completed'
    GROUP BY ROUND(file_size/1048576) -- 按MB分组
  `).all();
}
```

这样您就有了一个完整的数据库支持系统，支持断点续传、数据持久化、统计分析和自动维护！ 