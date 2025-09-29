-- ============================================
-- 断点续传文件上传系统 - MySQL数据库初始化脚本
-- ============================================
-- 版本: 1.0
-- 创建时间: 2024-01-01
-- 说明: 包含数据库、表、索引、用户的完整创建脚本

-- ============================================
-- 第1步: 创建数据库
-- ============================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS file_upload 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE file_upload;

-- ============================================
-- 第2步: 创建用户和授权
-- ============================================

-- 创建专用用户
CREATE USER IF NOT EXISTS 'upload_user'@'localhost' IDENTIFIED BY 'upload123456';

-- 授予权限
GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'localhost';

-- 如果需要远程访问，取消下面的注释
-- CREATE USER IF NOT EXISTS 'upload_user'@'%' IDENTIFIED BY 'upload123456';
-- GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- ============================================
-- 第3步: 创建数据表
-- ============================================

-- 3.1 上传文件主表
DROP TABLE IF EXISTS uploads;
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
  user_agent TEXT NULL COMMENT '客户端用户代理信息'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件上传主表';

-- 3.2 分片上传记录表
DROP TABLE IF EXISTS chunks;
CREATE TABLE chunks (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  file_id VARCHAR(255) NOT NULL COMMENT '关联的文件ID',
  chunk_index INT NOT NULL COMMENT '分片序号（从0开始）',
  chunk_size INT NOT NULL COMMENT '分片大小（字节）',
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '分片上传时间',
  chunk_md5 VARCHAR(32) NULL COMMENT '分片MD5值（可选）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分片上传记录表';

-- 3.3 上传统计表
DROP TABLE IF EXISTS upload_stats;
CREATE TABLE upload_stats (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  date DATE UNIQUE NOT NULL COMMENT '统计日期',
  total_uploads INT DEFAULT 0 COMMENT '总上传次数',
  successful_uploads INT DEFAULT 0 COMMENT '成功上传次数',
  failed_uploads INT DEFAULT 0 COMMENT '失败上传次数',
  total_size BIGINT DEFAULT 0 COMMENT '总上传大小（字节）',
  total_chunks INT DEFAULT 0 COMMENT '总分片数量'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上传统计表';

-- 3.4 系统日志表
DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '日志时间戳',
  level ENUM('info', 'warn', 'error') NOT NULL COMMENT '日志级别',
  message TEXT NOT NULL COMMENT '日志消息内容',
  file_id VARCHAR(255) NULL COMMENT '相关文件ID',
  details TEXT NULL COMMENT '详细信息（如错误堆栈）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';

-- ============================================
-- 第4步: 创建索引
-- ============================================

-- uploads 表索引
ALTER TABLE uploads ADD INDEX idx_file_id (file_id);
ALTER TABLE uploads ADD INDEX idx_status (status);
ALTER TABLE uploads ADD INDEX idx_start_time (start_time);
ALTER TABLE uploads ADD INDEX idx_md5 (md5);
ALTER TABLE uploads ADD INDEX idx_status_time (status, start_time);

-- chunks 表索引
ALTER TABLE chunks ADD UNIQUE KEY unique_chunk (file_id, chunk_index);
ALTER TABLE chunks ADD INDEX idx_file_id (file_id);
ALTER TABLE chunks ADD INDEX idx_chunk_index (chunk_index);
ALTER TABLE chunks ADD INDEX idx_upload_time (upload_time);

-- upload_stats 表索引
ALTER TABLE upload_stats ADD INDEX idx_date (date);

-- logs 表索引
ALTER TABLE logs ADD INDEX idx_timestamp (timestamp);
ALTER TABLE logs ADD INDEX idx_level (level);
ALTER TABLE logs ADD INDEX idx_file_id (file_id);
ALTER TABLE logs ADD INDEX idx_level_time (level, timestamp);

-- ============================================
-- 第5步: 创建外键约束
-- ============================================

-- chunks 表外键
ALTER TABLE chunks ADD FOREIGN KEY (file_id) REFERENCES uploads(file_id) ON DELETE CASCADE;

-- ============================================
-- 第6步: 插入初始数据（可选）
-- ============================================

-- 插入初始统计数据
INSERT IGNORE INTO upload_stats (date, total_uploads, successful_uploads, failed_uploads, total_size, total_chunks) 
VALUES (CURDATE(), 0, 0, 0, 0, 0);

-- 插入初始化日志
INSERT INTO logs (level, message, details) 
VALUES ('info', '数据库初始化完成', 'MySQL数据库和表结构创建成功');

-- ============================================
-- 第7步: 验证创建结果
-- ============================================

-- 显示所有表
SHOW TABLES;

-- 显示数据库信息
SELECT 
    'file_upload' AS database_name,
    DEFAULT_CHARACTER_SET_NAME AS charset,
    DEFAULT_COLLATION_NAME AS collation
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'file_upload';

-- 显示表信息
SELECT 
    table_name AS '表名',
    table_rows AS '行数',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS '大小(MB)',
    table_comment AS '备注'
FROM information_schema.TABLES 
WHERE table_schema = 'file_upload'
ORDER BY table_name;

-- ============================================
-- 完成信息
-- ============================================

SELECT 
'✅ 数据库初始化完成!' AS message,
NOW() AS completion_time,
'请使用以下信息连接数据库:' AS note,
'Host: localhost' AS host,
'Database: file_upload' AS database_name,
'User: upload_user' AS username,
'Password: upload123456' AS password_info;

-- ============================================
-- 使用说明
-- ============================================

/*
使用方法:
1. 在MySQL命令行中执行:
   mysql -u root -p < init-database.sql

2. 或者在MySQL客户端中:
   source /path/to/init-database.sql

3. 验证创建结果:
   USE file_upload;
   SHOW TABLES;
   
4. 测试连接:
   mysql -u upload_user -p file_upload

注意事项:
- 请根据需要修改用户密码
- 生产环境请配置更严格的权限
- 定期备份数据库
- 监控数据库性能
*/ 