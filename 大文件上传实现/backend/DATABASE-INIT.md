# 🗄️ MySQL数据库初始化指南

## 📖 概述

本文档详细说明如何为断点续传文件上传系统初始化MySQL数据库，包括数据库创建、表结构、索引、用户权限等完整配置。

## 🎯 系统要求

- MySQL 5.7+ 或 MySQL 8.0+
- UTF8MB4字符集支持
- InnoDB存储引擎

## 🚀 快速开始

### 方法一：自动初始化（推荐）

```bash
# 1. 运行自动安装脚本
./install-mysql.bat

# 2. 启动服务器（会自动创建表）
npm start
```

### 方法二：手动初始化

按照下面的详细步骤进行手动配置。

## 📋 详细初始化步骤

### 第1步：登录MySQL

```bash
# 使用root用户登录
mysql -u root -p

# 或指定主机
mysql -h localhost -u root -p
```

### 第2步：创建数据库

```sql
-- 创建数据库（支持UTF8MB4字符集）
CREATE DATABASE file_upload 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 查看数据库
SHOW DATABASES;

-- 使用数据库
USE file_upload;
```

### 第3步：创建用户和授权

```sql
-- 创建专用用户
CREATE USER 'upload_user'@'localhost' IDENTIFIED BY 'upload123456';

-- 授予所有权限（生产环境建议限制权限）
GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'localhost';

-- 如果需要远程访问，创建远程用户
CREATE USER 'upload_user'@'%' IDENTIFIED BY 'upload123456';
GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 查看用户权限
SHOW GRANTS FOR 'upload_user'@'localhost';
```

### 第4步：创建数据表

#### 4.1 上传文件主表 (uploads)

```sql
CREATE TABLE uploads (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  file_id VARCHAR(255) UNIQUE NOT NULL COMMENT '文件唯一标识(md5_filename)',
  file_name VARCHAR(500) NOT NULL COMMENT '原始文件名',
  file_size BIGINT DEFAULT 0 COMMENT '文件大小（字节）',
  md5 VARCHAR(32) NOT NULL COMMENT '文件MD5哈希值',
  total_chunks INT NOT NULL COMMENT '总分片数量',
  uploaded_chunks INT DEFAULT 0 COMMENT '已上传分片数量',
  status ENUM('uploading', 'completed', 'failed') DEFAULT 'uploading' COMMENT '上传状态',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始上传时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  complete_time TIMESTAMP NULL COMMENT '完成上传时间',
  final_path VARCHAR(1000) NULL COMMENT '最终文件存储路径',
  actual_md5 VARCHAR(32) NULL COMMENT '实际文件MD5（用于验证）',
  upload_speed DECIMAL(10,2) DEFAULT 0 COMMENT '上传速度（chunks/秒）',
  client_ip VARCHAR(45) NULL COMMENT '客户端IP地址（支持IPv6）',
  user_agent TEXT NULL COMMENT '客户端用户代理信息',
  
  -- 创建索引
  INDEX idx_file_id (file_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  INDEX idx_md5 (md5),
  INDEX idx_status_time (status, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件上传主表';
```

#### 4.2 分片上传记录表 (chunks)

```sql
CREATE TABLE chunks (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  file_id VARCHAR(255) NOT NULL COMMENT '关联的文件ID',
  chunk_index INT NOT NULL COMMENT '分片序号（从0开始）',
  chunk_size INT NOT NULL COMMENT '分片大小（字节）',
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '分片上传时间',
  chunk_md5 VARCHAR(32) NULL COMMENT '分片MD5值（可选）',
  
  -- 创建唯一约束和索引
  UNIQUE KEY unique_chunk (file_id, chunk_index),
  INDEX idx_file_id (file_id),
  INDEX idx_chunk_index (chunk_index),
  INDEX idx_upload_time (upload_time),
  
  -- 外键约束
  FOREIGN KEY (file_id) REFERENCES uploads(file_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分片上传记录表';
```

#### 4.3 上传统计表 (upload_stats)

```sql
CREATE TABLE upload_stats (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  date DATE UNIQUE NOT NULL COMMENT '统计日期',
  total_uploads INT DEFAULT 0 COMMENT '总上传次数',
  successful_uploads INT DEFAULT 0 COMMENT '成功上传次数',
  failed_uploads INT DEFAULT 0 COMMENT '失败上传次数',
  total_size BIGINT DEFAULT 0 COMMENT '总上传大小（字节）',
  total_chunks INT DEFAULT 0 COMMENT '总分片数量',
  
  -- 创建索引
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上传统计表';
```

#### 4.4 系统日志表 (logs)

```sql
CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '日志时间戳',
  level ENUM('info', 'warn', 'error') NOT NULL COMMENT '日志级别',
  message TEXT NOT NULL COMMENT '日志消息内容',
  file_id VARCHAR(255) NULL COMMENT '相关文件ID',
  details TEXT NULL COMMENT '详细信息（如错误堆栈）',
  
  -- 创建索引
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_file_id (file_id),
  INDEX idx_level_time (level, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';
```

### 第5步：验证表结构

```sql
-- 查看所有表
SHOW TABLES;

-- 查看表结构
DESCRIBE uploads;
DESCRIBE chunks;
DESCRIBE upload_stats;
DESCRIBE logs;

-- 查看表创建语句
SHOW CREATE TABLE uploads;

-- 查看索引信息
SHOW INDEX FROM uploads;
```

### 第6步：插入测试数据（可选）

```sql
-- 插入测试统计数据
INSERT INTO upload_stats (date, total_uploads, successful_uploads, failed_uploads, total_size, total_chunks) 
VALUES 
('2024-01-01', 10, 8, 2, 1073741824, 500),
('2024-01-02', 15, 12, 3, 1610612736, 750);

-- 插入测试日志
INSERT INTO logs (level, message, details) 
VALUES 
('info', '系统启动', '数据库初始化完成'),
('info', '测试数据插入', '初始化测试数据');

-- 查看测试数据
SELECT * FROM upload_stats;
SELECT * FROM logs ORDER BY timestamp DESC LIMIT 5;
```

## 🔧 高级配置

### 性能优化配置

#### my.cnf 优化建议

```ini
[mysqld]
# 基本配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+8:00'

# 性能优化
innodb_buffer_pool_size = 1G              # 根据内存调整
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_file_per_table = 1
innodb_open_files = 300

# 连接优化
max_connections = 200
max_allowed_packet = 1G                    # 支持大文件上传
connect_timeout = 60
wait_timeout = 28800

# 查询优化
query_cache_size = 128M
query_cache_type = 1
tmp_table_size = 64M
max_heap_table_size = 64M

# 文件上传优化
bulk_insert_buffer_size = 256M
```

#### 额外索引优化

```sql
-- 根据实际查询模式添加复合索引
ALTER TABLE uploads ADD INDEX idx_md5_status (md5, status);
ALTER TABLE uploads ADD INDEX idx_client_time (client_ip, start_time);
ALTER TABLE chunks ADD INDEX idx_file_time (file_id, upload_time);

-- 如果需要分区表（大数据量场景）
-- 按日期分区示例
ALTER TABLE logs PARTITION BY RANGE (TO_DAYS(timestamp)) (
    PARTITION p2024_01 VALUES LESS THAN (TO_DAYS('2024-02-01')),
    PARTITION p2024_02 VALUES LESS THAN (TO_DAYS('2024-03-01')),
    PARTITION p2024_03 VALUES LESS THAN (TO_DAYS('2024-04-01'))
);
```

### 安全配置

#### 权限最小化原则

```sql
-- 创建只读用户（用于报表查询）
CREATE USER 'upload_readonly'@'localhost' IDENTIFIED BY 'readonly123';
GRANT SELECT ON file_upload.* TO 'upload_readonly'@'localhost';

-- 创建备份用户
CREATE USER 'upload_backup'@'localhost' IDENTIFIED BY 'backup123';
GRANT SELECT, LOCK TABLES ON file_upload.* TO 'upload_backup'@'localhost';

-- 应用用户权限（生产环境推荐）
CREATE USER 'upload_app'@'localhost' IDENTIFIED BY 'app123456';
GRANT SELECT, INSERT, UPDATE, DELETE ON file_upload.uploads TO 'upload_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON file_upload.chunks TO 'upload_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON file_upload.upload_stats TO 'upload_app'@'localhost';
GRANT INSERT ON file_upload.logs TO 'upload_app'@'localhost';

FLUSH PRIVILEGES;
```

## 🛠️ 维护操作

### 日常维护SQL

```sql
-- 查看数据库大小
SELECT 
    table_schema AS '数据库',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS '大小(MB)'
FROM information_schema.tables 
WHERE table_schema = 'file_upload'
GROUP BY table_schema;

-- 查看各表大小
SELECT 
    table_name AS '表名',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS '大小(MB)',
    table_rows AS '行数'
FROM information_schema.TABLES 
WHERE table_schema = 'file_upload'
ORDER BY (data_length + index_length) DESC;

-- 查看今日上传统计
SELECT 
    DATE(start_time) as '日期',
    COUNT(*) as '总数',
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as '成功',
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as '失败',
    ROUND(SUM(file_size)/1024/1024/1024, 2) as '总大小(GB)'
FROM uploads 
WHERE start_time >= CURDATE()
GROUP BY DATE(start_time);

-- 清理30天前的日志
DELETE FROM logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理失败的上传记录（1天前）
DELETE FROM uploads WHERE status = 'failed' AND update_time < DATE_SUB(NOW(), INTERVAL 1 DAY);
```

### 备份和恢复

```bash
# 完整备份
mysqldump -u root -p --single-transaction --routines --triggers file_upload > backup_$(date +%Y%m%d_%H%M%S).sql

# 只备份结构
mysqldump -u root -p --no-data file_upload > schema_$(date +%Y%m%d).sql

# 只备份数据
mysqldump -u root -p --no-create-info file_upload > data_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p file_upload < backup_20240101_120000.sql
```

## 🔍 故障排查

### 常见问题和解决方案

#### 1. 字符集问题

```sql
-- 检查数据库字符集
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'file_upload';

-- 修改数据库字符集
ALTER DATABASE file_upload CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修改表字符集
ALTER TABLE uploads CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2. 权限问题

```sql
-- 检查用户权限
SHOW GRANTS FOR 'upload_user'@'localhost';

-- 重新授权
GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. 连接问题

```sql
-- 查看当前连接
SHOW PROCESSLIST;

-- 查看最大连接数
SHOW VARIABLES LIKE 'max_connections';

-- 修改最大连接数
SET GLOBAL max_connections = 300;
```

#### 4. 性能问题

```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- 分析表
ANALYZE TABLE uploads;
ANALYZE TABLE chunks;

-- 优化表
OPTIMIZE TABLE uploads;
```

## 📝 配置文件模板

### .env 配置示例

```env
# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=upload_user
DB_PASSWORD=upload123456
DB_NAME=file_upload

# 数据库类型
DATABASE_TYPE=mysql

# 连接池配置
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# 服务器配置
PORT=3000
NODE_ENV=production
```

### Node.js 连接配置示例

```javascript
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'upload_user',
  password: process.env.DB_PASSWORD || 'upload123456',
  database: process.env.DB_NAME || 'file_upload',
  charset: 'utf8mb4',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: false
};

const pool = mysql.createPool(config);
```

## 🎯 验证检查清单

初始化完成后，请验证以下项目：

- [ ] 数据库 `file_upload` 创建成功
- [ ] 用户 `upload_user` 创建并授权
- [ ] 4个数据表创建成功（uploads, chunks, upload_stats, logs）
- [ ] 所有索引创建成功
- [ ] 外键约束正常工作
- [ ] 字符集为 utf8mb4
- [ ] 能够成功连接和查询
- [ ] 测试数据插入成功

## 📚 参考资料

- [MySQL 8.0 官方文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [UTF8MB4 字符集说明](https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html)
- [InnoDB 存储引擎](https://dev.mysql.com/doc/refman/8.0/en/innodb-storage-engine.html)
- [MySQL 性能优化](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

---

💡 **提示**: 生产环境部署时，请务必修改默认密码，配置SSL连接，并根据实际负载调整数据库参数。 