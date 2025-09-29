# 断点续传后端服务器

一个独立的Node.js后端服务，支持大文件断点续传上传。

## 📋 功能特性

- 🔄 **大文件分块上传** - 支持任意大小文件分片上传
- ⏸️ **断点续传** - 网络中断后可恢复上传
- 🔒 **MD5校验** - 确保文件完整性
- 🌐 **跨域支持** - 支持多个前端框架
- 📊 **实时监控** - 上传进度和服务器状态
- 🛡️ **错误处理** - 完善的错误处理和重试机制
- 🗑️ **自动清理** - 自动清理临时文件和过期状态
- 🗄️ **数据库支持** - 支持SQLite和MySQL两种数据库
- 📈 **数据统计** - 详细的上传统计和日志记录
- 🔧 **企业级** - 连接池、事务、高并发支持

## 🚀 快速开始

### 安装依赖
```bash
cd backend
npm install

# 选择数据库类型
# SQLite (默认，零配置)
install-database.bat

# 或 MySQL (企业级)
install-mysql.bat
```

### 启动服务器
```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

### 访问服务
- 服务地址: http://localhost:3000
- 健康检查: http://localhost:3000/api/health
- 服务统计: http://localhost:3000/api/stats

## 📁 目录结构

```
backend/
├── server.js          # 主服务器文件
├── package.json       # 依赖配置
├── README.md          # 说明文档
├── temp/              # 临时文件目录
├── uploads/           # 最终文件目录
└── chunks/            # 分片缓存目录
    └── {fileId}/      # 按文件ID分组的分片
        ├── chunk_0
        ├── chunk_1
        └── ...
```

## 📝 API接口

### 健康检查
```http
GET /api/health
```

**响应:**
```json
{
  "status": "ok",
  "message": "后端服务运行正常",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "node": "v20.0.0"
}
```

### 检查已上传分片
```http
POST /api/check-chunks
Content-Type: application/json

{
  "md5": "file_hash_value",
  "fileName": "example.zip",
  "totalChunks": 100
}
```

**响应:**
```json
{
  "success": true,
  "uploadedChunks": [0, 1, 2, 5, 6],
  "progress": 5
}
```

### 上传文件分片
```http
POST /api/upload-chunk
Content-Type: multipart/form-data

chunk: <file_chunk>
chunkIndex: 0
md5: file_hash_value
fileName: example.zip
totalChunks: 100
```

**响应:**
```json
{
  "success": true,
  "uploaded": 6,
  "total": 100,
  "progress": 6,
  "chunkIndex": 0
}
```

### 完成上传
```http
POST /api/complete-upload
Content-Type: application/json

{
  "md5": "file_hash_value",
  "fileName": "example.zip",
  "totalChunks": 100
}
```

**响应:**
```json
{
  "success": true,
  "fileName": "example.zip",
  "size": 104857600,
  "md5": "calculated_md5_hash",
  "path": "/uploads/example.zip",
  "uploadTime": 5000
}
```

### 获取上传进度
```http
GET /api/upload-status/{md5}/{fileName}
```

**响应:**
```json
{
  "uploaded": 50,
  "total": 100,
  "percentage": 50,
  "status": "uploading",
  "startTime": "2024-01-01T00:00:00.000Z",
  "lastUpdate": "2024-01-01T00:05:00.000Z"
}
```

### 删除上传任务
```http
DELETE /api/upload/{md5}/{fileName}
```

**响应:**
```json
{
  "success": true
}
```

### 服务器统计
```http
GET /api/stats
```

**响应:**
```json
{
  "activeUploads": 3,
  "totalMemoryUsage": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "uptime": 3600,
  "nodeVersion": "v20.0.0",
  "platform": "win32"
}
```

## ⚙️ 配置选项

### 环境变量
```bash
PORT=3000                    # 服务端口
NODE_ENV=production          # 运行环境
MAX_FILE_SIZE=10737418240   # 最大文件大小 (10GB)
```

### 支持的前端地址
- Vue3版本: http://localhost:5173
- React版本: http://localhost:4174
- 开发环境: http://localhost:3000

## 🔧 开发配置

### 修改CORS设置
在 `server.js` 中修改允许的源地址:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vue3版本
    'http://localhost:4174',  // React版本
    'https://your-domain.com' // 生产环境
  ]
}));
```

### 修改文件大小限制
```javascript
const upload = multer({ 
  dest: path.join(__dirname, 'temp'),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldSize: 10 * 1024 * 1024 // 10MB
  }
});
```

## 📊 性能特性

- **内存优化**: 使用流式处理，避免加载整个文件到内存
- **并发支持**: 支持多文件同时上传
- **自动清理**: 定时清理过期的上传状态和临时文件
- **错误恢复**: 完善的错误处理和资源清理
- **监控接口**: 提供服务器状态和性能监控

## 🛡️ 安全特性

- **文件大小限制**: 防止超大文件攻击
- **路径安全**: 防止目录遍历攻击
- **MD5验证**: 确保文件完整性
- **错误信息过滤**: 生产环境下隐藏敏感错误信息

## 🔄 部署建议

### PM2部署
```bash
npm install -g pm2
pm2 start server.js --name "upload-server"
pm2 startup
pm2 save
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 10G;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 上传超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

## 🐛 故障排除

### 常见问题

1. **CORS错误**: 检查前端地址是否在允许列表中
2. **文件大小限制**: 修改multer和nginx的大小限制
3. **内存不足**: 监控内存使用，适当调整并发数量
4. **磁盘空间**: 定期清理临时文件和上传文件

### 日志监控
服务器会输出详细的操作日志，包括:
- 📁 目录创建
- ✅ 分片检查
- 📤 分片上传
- 🔄 文件合并
- 🗑️ 资源清理

## �� 许可证

MIT License 