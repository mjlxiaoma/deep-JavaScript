# 🐬 MySQL数据库功能文档

## 🎯 概述

本项目支持使用 MySQL 数据库来持久化存储上传记录、进度跟踪、统计信息和系统日志，提供企业级的数据库解决方案。

## 🆚 MySQL vs SQLite

| 特性 | MySQL | SQLite |
|------|-------|---------|
| **并发性能** | ✅ 高并发支持 | ⚠️ 读多写少 |
| **数据量** | ✅ 支持大数据量 | ⚠️ 适合中小型应用 |
| **部署复杂度** | ⚠️ 需要独立服务器 | ✅ 零配置 |
| **事务支持** | ✅ 完整ACID | ✅ 基本ACID |
| **网络访问** | ✅ 支持远程访问 | ❌ 本地文件 |
| **备份恢复** | ✅ 丰富的工具 | ✅ 简单文件复制 |
| **资源消耗** | ⚠️ 相对较高 | ✅ 轻量级 |

## 🗄️ 数据库结构

### 1. 上传文件表 (uploads)

```sql
CREATE TABLE uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id VARCHAR(255) UNIQUE NOT NULL,          -- 文件唯一标识
  file_name VARCHAR(500) NOT NULL,               -- 原始文件名
  file_size BIGINT DEFAULT 0,                    -- 文件大小（字节）
  md5 VARCHAR(32) NOT NULL,                      -- 文件MD5哈希
  total_chunks INT NOT NULL,                     -- 总分片数
  uploaded_chunks INT DEFAULT 0,                 -- 已上传分片数
  status ENUM('uploading', 'completed', 'failed') DEFAULT 'uploading',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  complete_time TIMESTAMP NULL,
  final_path VARCHAR(1000) NULL,                 -- 最终文件路径
  actual_md5 VARCHAR(32) NULL,                   -- 实际文件MD5
  upload_speed DECIMAL(10,2) DEFAULT 0,          -- 上传速度
  client_ip VARCHAR(45) NULL,                    -- 客户端IP (支持IPv6)
  user_agent TEXT NULL,                          -- 用户代理
  INDEX idx_file_id (file_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  INDEX idx_md5 (md5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. 分片记录表 (chunks)

```sql
CREATE TABLE chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id VARCHAR(255) NOT NULL,                 -- 关联文件ID
  chunk_index INT NOT NULL,                      -- 分片索引
  chunk_size INT NOT NULL,                       -- 分片大小
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  chunk_md5 VARCHAR(32) NULL,                    -- 分片MD5
  UNIQUE KEY unique_chunk (file_id, chunk_index),
  INDEX idx_file_id (file_id),
  INDEX idx_chunk_index (chunk_index),
  FOREIGN KEY (file_id) REFERENCES uploads(file_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. 统计信息表 (upload_stats)

```sql
CREATE TABLE upload_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE UNIQUE NOT NULL,                     -- 日期
  total_uploads INT DEFAULT 0,                   -- 总上传数
  successful_uploads INT DEFAULT 0,              -- 成功上传数
  failed_uploads INT DEFAULT 0,                  -- 失败上传数
  total_size BIGINT DEFAULT 0,                   -- 总上传大小
  total_chunks INT DEFAULT 0,                    -- 总分片数
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4. 系统日志表 (logs)

```sql
CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level ENUM('info', 'warn', 'error') NOT NULL,  -- 日志级别
  message TEXT NOT NULL,                         -- 日志消息
  file_id VARCHAR(255) NULL,                     -- 相关文件ID
  details TEXT NULL,                             -- 详细信息
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_file_id (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 🚀 安装和配置

### 1. 安装MySQL服务器

#### 方案A: 官方MySQL
```bash
# 下载地址: https://dev.mysql.com/downloads/mysql/
# Windows: 下载MSI安装包
# macOS: 使用Homebrew
brew install mysql

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server
```

#### 方案B: 使用XAMPP
```bash
# 下载地址: https://www.apachefriends.org/
# 包含 Apache + MySQL + PHP + phpMyAdmin
```

### 2. 配置MySQL

```sql
-- 登录MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE file_upload CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（推荐）
CREATE USER 'upload_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
exit;
```

### 3. 安装Node.js依赖

```bash
# 进入backend目录
cd backend

# 运行自动安装脚本
install-mysql.bat

# 或手动安装
npm install mysql2 dotenv
```

### 4. 环境变量配置

复制 `env.example` 为 `.env` 并配置：

```env
# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=upload_user
DB_PASSWORD=your_secure_password
DB_NAME=file_upload

# 数据库类型
DATABASE_TYPE=mysql

# 其他配置...
```

## 🔧 高级配置

### 连接池配置

在 `database-mysql.js` 中可以调整连接池参数：

```javascript
this.pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'file_upload',
  waitForConnections: true,
  connectionLimit: 10,        // 最大连接数
  queueLimit: 0,              // 队列限制
  acquireTimeout: 60000,      // 获取连接超时
  timeout: 60000,             // 查询超时
  reconnect: true,            // 自动重连
  charset: 'utf8mb4'          // 字符集
});
```

### MySQL优化建议

#### my.cnf 配置优化

```ini
[mysqld]
# 基本配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 性能优化
innodb_buffer_pool_size = 1G        # 根据内存调整
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 128M
max_connections = 200

# 文件上传优化
max_allowed_packet = 1G              # 支持大文件
bulk_insert_buffer_size = 256M
```

#### 索引优化

```sql
-- 根据实际查询模式添加复合索引
ALTER TABLE uploads ADD INDEX idx_status_time (status, start_time);
ALTER TABLE uploads ADD INDEX idx_md5_name (md5, file_name(50));
ALTER TABLE chunks ADD INDEX idx_file_time (file_id, upload_time);
```

## 📊 功能特性

### ✅ 企业级特性

- **连接池管理**: 自动管理数据库连接，提高性能
- **事务支持**: 保证数据一致性
- **自动重连**: 网络中断后自动恢复
- **UTF8MB4支持**: 支持emoji和特殊字符
- **外键约束**: 维护数据完整性
- **索引优化**: 提供高性能查询

### 🔒 安全特性

- **参数化查询**: 防止SQL注入
- **用户权限控制**: 专用数据库用户
- **连接加密**: 支持SSL连接
- **审计日志**: 完整的操作记录

### 📈 监控和维护

- **连接状态监控**: 实时连接池状态
- **性能统计**: 查询性能分析
- **自动清理**: 定期清理过期数据
- **健康检查**: 定期检查数据库状态

## 🛠️ API增强

### 数据库健康检查

```http
GET /api/database/health
```

**响应:**
```json
{
  "success": true,
  "database": "mysql",
  "status": "connected",
  "pool": {
    "totalConnections": 5,
    "idleConnections": 3,
    "queuedRequests": 0
  }
}
```

### 详细统计信息

MySQL版本提供更丰富的统计信息：

```json
{
  "daily": [
    {
      "date": "2024-01-01",
      "total_uploads": 150,
      "successful_uploads": 145,
      "failed_uploads": 5,
      "total_size": 15728640000,
      "total_chunks": 7500
    }
  ],
  "performance": {
    "avgUploadTime": 45.6,
    "avgChunkSize": 2097152,
    "peakConcurrency": 12
  }
}
```

## 🔧 故障排除

### 常见错误和解决方案

#### 1. 连接被拒绝 (ECONNREFUSED)

```bash
# 检查MySQL是否运行
sudo systemctl status mysql
# 或
brew services list | grep mysql

# 启动MySQL
sudo systemctl start mysql
# 或
brew services start mysql
```

#### 2. 访问被拒绝 (ER_ACCESS_DENIED_ERROR)

```sql
-- 检查用户权限
SHOW GRANTS FOR 'your_user'@'localhost';

-- 重置密码
ALTER USER 'your_user'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### 3. 数据库不存在 (ER_BAD_DB_ERROR)

```sql
-- 创建数据库
CREATE DATABASE file_upload CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 4. 连接超时

```javascript
// 调整超时设置
acquireTimeout: 60000,
timeout: 60000,
```

### 性能问题诊断

```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 分析查询性能
EXPLAIN SELECT * FROM uploads WHERE status = 'uploading';

-- 查看索引使用情况
SHOW INDEX FROM uploads;
```

## 🔄 迁移和备份

### 数据备份

```bash
# 完整备份
mysqldump -u root -p file_upload > backup_$(date +%Y%m%d).sql

# 仅结构
mysqldump -u root -p --no-data file_upload > schema.sql

# 仅数据
mysqldump -u root -p --no-create-info file_upload > data.sql
```

### 数据恢复

```bash
# 恢复数据库
mysql -u root -p file_upload < backup_20240101.sql
```

### 从SQLite迁移

```javascript
// 迁移脚本示例
const sqlite3 = require('sqlite3');
const mysql = require('mysql2/promise');

async function migrateFromSQLite() {
  // 读取SQLite数据
  const sqliteDb = new sqlite3.Database('./data/uploads.db');
  
  // 连接MySQL
  const mysqlDb = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'file_upload'
  });
  
  // 执行迁移逻辑
  // ...
}
```

## 🔄 高可用部署

### 主从复制

```sql
-- 主服务器配置
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW

-- 从服务器配置
[mysqld]
server-id = 2
relay-log = mysql-relay-bin
```

### 集群部署

```javascript
// 读写分离配置
const masterPool = mysql.createPool({
  host: 'master.mysql.com',
  // ... 写操作
});

const slavePool = mysql.createPool({
  host: 'slave.mysql.com', 
  // ... 读操作
});
```

## 📚 扩展功能

### 自定义字段

```sql
-- 添加用户ID字段
ALTER TABLE uploads ADD COLUMN user_id INT NULL;
ALTER TABLE uploads ADD INDEX idx_user_id (user_id);

-- 添加文件类型字段
ALTER TABLE uploads ADD COLUMN file_type VARCHAR(50) NULL;
```

### 分表策略

```sql
-- 按月分表
CREATE TABLE uploads_202401 LIKE uploads;
CREATE TABLE uploads_202402 LIKE uploads;

-- 使用触发器或应用逻辑路由数据
```

这样您就有了一个功能完整、性能优异的MySQL数据库支持系统！🐬✨ 