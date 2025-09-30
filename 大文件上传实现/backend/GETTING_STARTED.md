# 🚀 快速入门指南

## 📋 目录
1. [环境要求](#环境要求)
2. [安装步骤](#安装步骤)
3. [启动服务](#启动服务)
4. [API使用示例](#api使用示例)
5. [常见问题](#常见问题)

## 环境要求

### 必需
- **Node.js**: >= 16.0.0
- **MySQL**: >= 5.7 或 MariaDB >= 10.2

### 可选
- **nodemon**: 开发环境自动重启
- **Postman**: API测试工具

## 安装步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 配置数据库

#### 方式一：自动安装（推荐）
```bash
# Windows
quick-init-db.bat

# 或手动运行
mysql -u root -p < init-database.sql
```

#### 方式二：手动配置
```sql
-- 连接到MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE upload_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'upload_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON upload_system.* TO 'upload_user'@'localhost';
FLUSH PRIVILEGES;

-- 使用数据库
USE upload_system;

-- 创建表（执行 init-database.sql 中的表创建语句）
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`：
```bash
cp env.example .env
```

编辑 `.env` 文件：
```env
# 服务器配置
PORT=3000
HOST=localhost
NODE_ENV=development

# 数据库配置
DATABASE_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=upload_user
DB_PASSWORD=your_password
DB_NAME=upload_system
```

## 启动服务

### 方式一：使用旧版服务器（单文件）
```bash
npm start
# 或
node server.js
```

### 方式二：使用新版服务器（MVC架构，推荐）
```bash
npm run start:new
# 或
node server-new.js
```

### 开发模式（自动重启）
```bash
# 旧版
npm run dev

# 新版（推荐）
npm run dev:new
```

### 快捷启动（Windows）
```bash
# 双击运行
start.bat
```

## 验证安装

访问健康检查接口：
```bash
curl http://localhost:3000/api/health
```

响应示例：
```json
{
  "success": true,
  "message": "服务正常运行",
  "data": {
    "status": "ok",
    "uptime": 123.456,
    "timestamp": "2025-01-20T10:00:00.000Z"
  }
}
```

## API使用示例

### 1. 检查已上传分片

**请求**：
```bash
curl -X POST http://localhost:3000/api/check-chunks \
  -H "Content-Type: application/json" \
  -d '{
    "md5": "abc123def456",
    "fileName": "test.zip",
    "totalChunks": 10,
    "fileSize": 10485760
  }'
```

**响应**：
```json
{
  "success": true,
  "data": {
    "uploadedChunks": [0, 1, 2]
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### 2. 上传分片

**请求**：
```bash
curl -X POST http://localhost:3000/api/upload-chunk \
  -F "chunk=@chunk_0.bin" \
  -F "md5=abc123def456" \
  -F "fileName=test.zip" \
  -F "chunkIndex=0" \
  -F "totalChunks=10"
```

**响应**：
```json
{
  "success": true,
  "message": "分片上传成功",
  "data": {
    "chunkIndex": 0,
    "fileId": "abc123def456_test.zip"
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### 3. 完成上传

**请求**：
```bash
curl -X POST http://localhost:3000/api/complete-upload \
  -H "Content-Type: application/json" \
  -d '{
    "md5": "abc123def456",
    "fileName": "test.zip",
    "totalChunks": 10
  }'
```

**响应**：
```json
{
  "success": true,
  "message": "文件上传完成",
  "data": {
    "success": true,
    "filePath": "./uploads/test.zip",
    "fileSize": 10485760
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### 4. 获取上传历史

**请求**：
```bash
curl "http://localhost:3000/api/uploads/history?page=1&pageSize=10"
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "fileId": "abc123def456_test.zip",
      "fileName": "test.zip",
      "fileSize": 10485760,
      "status": "completed",
      "createdAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### 5. 获取统计信息

**请求**：
```bash
curl http://localhost:3000/api/database/stats
```

**响应**：
```json
{
  "success": true,
  "data": {
    "totalUploads": 100,
    "completedUploads": 80,
    "failedUploads": 5,
    "totalSize": 1073741824,
    "averageSize": 10737418
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

## 前端集成示例

### JavaScript (原生)
```javascript
// 1. 计算文件MD5
async function calculateMD5(file) {
  // 使用 spark-md5 库
  const spark = new SparkMD5.ArrayBuffer();
  const chunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < chunks; i++) {
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const buffer = await chunk.arrayBuffer();
    spark.append(buffer);
  }
  
  return spark.end();
}

// 2. 检查已上传分片
async function checkChunks(md5, fileName, totalChunks, fileSize) {
  const response = await fetch('http://localhost:3000/api/check-chunks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ md5, fileName, totalChunks, fileSize })
  });
  const data = await response.json();
  return data.data.uploadedChunks;
}

// 3. 上传分片
async function uploadChunk(chunk, md5, fileName, chunkIndex, totalChunks) {
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('md5', md5);
  formData.append('fileName', fileName);
  formData.append('chunkIndex', chunkIndex);
  formData.append('totalChunks', totalChunks);
  
  const response = await fetch('http://localhost:3000/api/upload-chunk', {
    method: 'POST',
    body: formData
  });
  return response.json();
}

// 4. 完成上传
async function completeUpload(md5, fileName, totalChunks) {
  const response = await fetch('http://localhost:3000/api/complete-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ md5, fileName, totalChunks })
  });
  return response.json();
}
```

### React/Vue 示例
参见项目中的 `React版本` 和 `Vue3版本` 目录。

## 常见问题

### Q1: 数据库连接失败
**A**: 检查以下几点：
1. MySQL服务是否启动
2. `.env` 中数据库配置是否正确
3. 数据库用户权限是否足够
4. 防火墙是否阻止连接

```bash
# 测试数据库连接
node test-mysql.js
```

### Q2: 端口已被占用
**A**: 修改 `.env` 中的 `PORT` 配置，或关闭占用端口的进程：

```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <进程ID>

# Linux/Mac
lsof -i :3000
kill -9 <进程ID>
```

### Q3: 文件上传失败
**A**: 检查：
1. `chunks/` 和 `uploads/` 目录是否有写入权限
2. 文件大小是否超过限制
3. 磁盘空间是否充足
4. 日志文件中的错误信息

```bash
# 查看日志
tail -f logs/$(date +%Y-%m-%d).log
```

### Q4: 如何修改上传文件大小限制？
**A**: 在 `.env` 中修改：
```env
MAX_FILE_SIZE=21474836480  # 20GB
CHUNK_SIZE=5242880         # 5MB
```

### Q5: 如何清理过期文件？
**A**: 系统会自动清理，也可手动触发：
```javascript
// 在代码中调用
await uploadService.cleanupOldUploads(7); // 清理7天前的文件
```

### Q6: 如何限制文件类型？
**A**: 在 `.env` 中配置：
```env
ALLOWED_EXTENSIONS=jpg,png,pdf,zip,mp4
```

### Q7: 如何查看系统日志？
**A**: 日志保存在 `logs/` 目录：
```bash
# 查看今天的日志
cat logs/$(date +%Y-%m-%d).log

# 实时查看日志
tail -f logs/$(date +%Y-%m-%d).log
```

## 📚 更多文档

- [架构说明](./ARCHITECTURE.md) - 详细的架构设计文档
- [数据库文档](./DATABASE-MYSQL.md) - 数据库设计和操作
- [API文档](./API.md) - 完整的API接口文档

## 🆘 获取帮助

- 查看 [Issue](https://github.com/your-repo/issues)
- 阅读 [FAQ](./FAQ.md)
- 联系技术支持

## 📝 下一步

1. ✅ 熟悉基本API使用
2. 🔧 根据需求修改配置
3. 🚀 集成到你的前端项目
4. 📈 监控系统运行状态
5. 🎯 根据 [ARCHITECTURE.md](./ARCHITECTURE.md) 进行功能扩展

---

祝你使用愉快！🎉 