# 断点续传文件上传系统

一个完整的断点续传文件上传解决方案，支持大文件上传、MD5校验和Web Worker优化。

## 功能特性

- ✅ **大文件分块上传** - 将大文件分割成小块进行上传
- ✅ **断点续传** - 支持暂停和恢复上传
- ✅ **MD5校验** - 确保文件完整性
- ✅ **Web Worker** - 在后台线程计算MD5，不阻塞UI
- ✅ **实时进度** - 显示上传进度和状态
- ✅ **重复检测** - 自动检测已上传的文件块
- ✅ **现代UI** - 响应式设计，良好的用户体验

## 技术架构

### 前端
- **HTML5 File API** - 文件选择和读取
- **Web Worker** - 后台计算MD5哈希
- **Fetch API** - 异步HTTP请求
- **Progress Tracking** - 实时进度更新

### 后端
- **Node.js + Express** - 服务器框架
- **Multer** - 文件上传中间件
- **Crypto** - MD5哈希计算
- **File System** - 文件块管理

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

### 3. 访问应用
打开浏览器访问：`http://localhost:3000`

## 工作原理

### 上传流程

1. **文件选择** - 用户选择要上传的文件
2. **文件分块** - 将文件分割成1MB的块
3. **MD5计算** - 在Web Worker中计算每个块的哈希值
4. **重复检测** - 检查服务器已有的文件块
5. **块上传** - 逐个上传缺失的文件块
6. **文件合并** - 服务器合并所有块生成完整文件
7. **完整性验证** - 验证最终文件的MD5值

### 断点续传实现

- **状态持久化** - 服务器记录每个文件的上传状态
- **块级别恢复** - 只上传缺失的文件块
- **智能重试** - 自动处理网络错误和重连

### Web Worker优化

```javascript
// 主线程不会被MD5计算阻塞
const worker = new Worker('md5-worker.js');
worker.postMessage({ fileChunk });
worker.onmessage = (e) => {
    const { hash } = e.data;
    // 处理计算结果
};
```

## API接口

### POST /api/check-chunks
检查已上传的文件块
```json
{
  "md5": "file_hash",
  "fileName": "example.zip", 
  "totalChunks": 100
}
```

### POST /api/upload-chunk
上传单个文件块
```
multipart/form-data:
- chunk: 文件块数据
- chunkIndex: 块索引
- md5: 文件MD5
- fileName: 文件名
- totalChunks: 总块数
```

### POST /api/complete-upload
完成上传并合并文件
```json
{
  "md5": "file_hash",
  "fileName": "example.zip",
  "totalChunks": 100
}
```

### GET /api/upload-status/:md5/:fileName
获取上传进度
```json
{
  "uploaded": 75,
  "total": 100,
  "percentage": 75
}
```

## 配置选项

### 客户端配置
```javascript
const uploader = new ChunkedUploader({
    chunkSize: 1024 * 1024,  // 1MB chunks
    maxConcurrent: 3,        // 最大并发上传数
    retryAttempts: 3         // 重试次数
});
```

### 服务器配置
```javascript
const config = {
    uploadsDir: './uploads',     // 上传目录
    chunksDir: './chunks',       // 临时块目录
    maxFileSize: '10GB',         // 最大文件大小
    allowedTypes: ['*']          // 允许的文件类型
};
```

## 目录结构

```
事件循环和异步/
├── index.html          # 前端页面
├── server.js           # Node.js服务器
├── package.json        # 项目配置
├── README.md          # 说明文档
├── temp/              # 临时文件目录
├── uploads/           # 最终文件目录
└── chunks/            # 文件块缓存目录
```

## 浏览器兼容性

- Chrome 50+
- Firefox 45+
- Safari 10+
- Edge 79+

## 安全考虑

- 文件类型验证
- 大小限制检查
- 路径遍历防护
- MD5完整性验证
- 临时文件清理

## 性能优化

- **分块上传** - 减少内存使用
- **Web Worker** - 避免UI阻塞
- **并发控制** - 平衡速度和资源
- **智能重试** - 处理网络波动
- **缓存策略** - 避免重复上传

## 故障排除

### 常见问题

1. **上传失败** - 检查网络连接和服务器状态
2. **进度卡住** - 尝试暂停后恢复上传
3. **文件损坏** - MD5校验会自动检测并重新上传
4. **服务器错误** - 查看控制台日志获取详细信息

### 调试模式
```javascript
// 开启详细日志
localStorage.setItem('upload-debug', 'true');
```

## 扩展功能

- 支持文件夹上传
- 图片预览和压缩
- 上传队列管理
- 云存储集成
- 权限控制
- 上传统计分析

## 许可证

MIT License - 自由使用和修改 