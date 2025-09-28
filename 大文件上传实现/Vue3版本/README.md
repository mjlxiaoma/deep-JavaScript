# Vue3 断点续传上传系统

一个基于 Vue3 + TypeScript + Vite + Element Plus 的现代化断点续传文件上传系统。

## ✨ 特性

- 🚀 **现代化技术栈**: Vue3 + TypeScript + Vite + Element Plus
- 📤 **断点续传**: 支持暂停、恢复、取消上传
- 🔒 **文件校验**: 使用 SparkMD5 确保文件完整性
- 🎯 **分块上传**: 大文件自动分片，降低内存占用
- 🔄 **智能重试**: 网络异常自动重连
- 📊 **实时进度**: 可视化上传进度和状态
- 🎨 **现代UI**: 基于 Element Plus 的精美界面
- 📱 **响应式设计**: 完美适配移动端和桌面端
- 🔧 **TypeScript**: 完整的类型安全支持

## 🛠 技术架构

### 前端技术栈
- **Vue 3.4+** - 组合式API
- **TypeScript** - 类型安全
- **Vite** - 快速构建工具
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Axios** - HTTP客户端
- **SparkMD5** - MD5计算

### 核心功能模块
```
src/
├── components/          # 通用组件
├── views/              # 页面组件
├── stores/             # Pinia状态管理
├── services/           # 业务服务层
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
└── router/             # 路由配置
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
cd Vue3版本
npm install
```

### 启动开发服务器
```bash
npm run dev
```

应用将在 `http://localhost:5173` 运行

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 📖 使用说明

### 1. 启动后端服务
确保后端API服务运行在 `http://localhost:3000`

### 2. 访问前端应用
打开浏览器访问 `http://localhost:5173`

### 3. 上传文件
- 点击上传区域选择文件
- 或直接拖拽文件到上传区域
- 支持多文件同时上传

### 4. 管理上传
- **暂停**: 暂停正在上传的文件
- **继续**: 恢复已暂停的上传
- **删除**: 取消并删除上传任务
- **清除已完成**: 批量清理已完成的文件

## 🔧 配置选项

### 上传配置
```typescript
const uploadConfig: UploadConfig = {
  chunkSize: 1024 * 1024,     // 分片大小 (1MB)
  maxConcurrent: 3,           // 最大并发数
  retryTimes: 3,              // 重试次数
  apiBaseUrl: '/api'          // API基础URL
}
```

### 环境变量
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api

# .env.production  
VITE_API_BASE_URL=/api
```

## 📝 API接口

### 检查已上传分片
```http
POST /api/check-chunks
Content-Type: application/json

{
  "md5": "file_hash",
  "fileName": "example.zip",
  "totalChunks": 100
}
```

### 上传文件分片
```http
POST /api/upload-chunk
Content-Type: multipart/form-data

chunk: <file_chunk>
chunkIndex: 0
md5: file_hash
fileName: example.zip
totalChunks: 100
```

### 完成上传
```http
POST /api/complete-upload
Content-Type: application/json

{
  "md5": "file_hash",
  "fileName": "example.zip",
  "totalChunks": 100
}
```

### 健康检查
```http
GET /api/health
```

## 🏗 项目结构

```
Vue3版本/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 可复用组件
│   ├── views/             # 页面组件
│   │   └── UploadPage.vue # 主上传页面
│   ├── stores/            # Pinia状态管理
│   │   └── upload.ts      # 上传状态管理
│   ├── services/          # 服务层
│   │   └── upload.ts      # 上传服务
│   ├── types/             # 类型定义
│   │   └── upload.ts      # 上传相关类型
│   ├── router/            # 路由配置
│   │   └── index.ts       # 路由定义
│   ├── utils/             # 工具函数
│   ├── App.vue            # 根组件
│   └── main.ts            # 应用入口
├── index.html             # HTML模板
├── vite.config.ts         # Vite配置
├── tsconfig.json          # TypeScript配置
├── package.json           # 依赖配置
└── README.md              # 项目说明
```

## 🔍 核心实现

### 文件MD5计算
```typescript
async calculateFileHash(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const spark = new SparkMD5.ArrayBuffer()
  const chunks = Math.ceil(file.size / this.config.chunkSize)
  
  for (let i = 0; i < chunks; i++) {
    const chunk = file.slice(i * this.config.chunkSize, (i + 1) * this.config.chunkSize)
    const arrayBuffer = await this.readChunk(chunk)
    spark.append(arrayBuffer)
    
    if (onProgress) {
      onProgress((i + 1) / chunks * 100)
    }
  }
  
  return spark.end()
}
```

### 断点续传逻辑
```typescript
// 1. 检查已上传分片
const uploadedChunks = await this.checkUploadedChunks(md5, fileName, totalChunks)

// 2. 只上传缺失的分片
for (let i = 0; i < totalChunks; i++) {
  if (!uploadedChunks.includes(i)) {
    await this.uploadChunk(chunk, i, md5, fileName, totalChunks)
  }
}

// 3. 完成上传
await this.completeUpload(md5, fileName, totalChunks)
```

### 状态管理
```typescript
// Pinia Store
export const useUploadStore = defineStore('upload', () => {
  const uploads = ref<Map<string, UploadFile>>(new Map())
  
  const addUpload = (upload: UploadFile) => {
    uploads.value.set(upload.id, upload)
  }
  
  const updateUpload = (id: string, updates: Partial<UploadFile>) => {
    const upload = uploads.value.get(id)
    if (upload) {
      Object.assign(upload, updates)
    }
  }
  
  return { uploads, addUpload, updateUpload }
})
```

## 🐛 调试

### 开发工具
```bash
# ESLint检查
npm run lint

# 格式化代码
npm run format
```

### 浏览器调试
1. 打开浏览器开发者工具
2. 查看Console标签页的日志
3. 检查Network标签页的请求
4. 使用Vue DevTools调试组件状态

## 🚀 部署

### 构建
```bash
npm run build
```

### 部署到Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## �� 许可证

MIT License 