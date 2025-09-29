# React 断点续传上传系统

基于 React 18 + TypeScript + Vite + Ant Design 的现代化大文件断点续传上传系统。

## ✨ 特性

- 🚀 **现代技术栈**: React 18 + TypeScript + Vite + Ant Design
- 📦 **状态管理**: Zustand + Immer 提供响应式状态管理
- 🎨 **UI 组件**: Ant Design + Styled Components 提供美观界面
- 🎬 **动画效果**: Framer Motion 提供流畅动画体验
- 📱 **响应式设计**: 支持桌面端和移动端
- 🔄 **断点续传**: 支持文件上传中断后继续上传
- 🔐 **MD5 校验**: Web Worker 后台计算文件 MD5 确保完整性
- 📊 **实时进度**: 实时显示上传进度、速度和剩余时间
- 🎯 **分片上传**: 大文件自动分片，支持并发上传
- 🔁 **错误重试**: 自动重试失败的分片，可配置重试次数
- 📋 **拖拽上传**: 支持文件拖拽上传
- 📈 **统计信息**: 实时显示上传统计和服务器状态

## 🛠️ 技术栈

### 核心框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具

### UI 和样式
- **Ant Design** - UI 组件库
- **Styled Components** - CSS-in-JS
- **Framer Motion** - 动画库

### 状态管理
- **Zustand** - 轻量级状态管理
- **Immer** - 不可变状态更新

### 网络和工具
- **Axios** - HTTP 客户端
- **SparkMD5** - MD5 计算
- **Day.js** - 日期处理

## 📦 安装依赖

```bash
# 安装依赖
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

## 🚀 开发

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 📁 项目结构

```
src/
├── components/          # 可复用组件
├── pages/              # 页面组件
│   └── UploadPage.tsx  # 上传页面
├── services/           # 服务层
│   └── uploadService.ts # 上传服务
├── stores/             # 状态管理
│   └── uploadStore.ts  # 上传状态管理
├── styles/             # 样式文件
│   └── GlobalStyle.ts  # 全局样式
├── types/              # 类型定义
│   └── upload.ts       # 上传相关类型
├── theme/              # 主题配置
│   └── index.ts        # 主题定义
├── App.tsx             # 根组件
└── main.tsx            # 入口文件
```

## 🔧 配置说明

### Vite 配置
- 代理设置：`/api` -> `http://localhost:3000`
- 路径别名：`@` -> `src`
- 构建优化：代码分割和压缩

### TypeScript 配置
- 严格模式开启
- 路径映射支持
- JSX 支持

### 上传配置
可在 `src/types/upload.ts` 中的 `UPLOAD_CONSTANTS` 修改默认配置：

```typescript
export const UPLOAD_CONSTANTS = {
  DEFAULT_CHUNK_SIZE: 2 * 1024 * 1024,    // 分片大小 2MB
  MAX_CONCURRENT_UPLOADS: 3,               // 最大并发数
  MAX_RETRIES: 3,                         // 最大重试次数
  REQUEST_TIMEOUT: 30000,                 // 请求超时 30秒
  MAX_FILE_SIZE: 10 * 1024 * 1024 * 1024 // 最大文件 10GB
}
```

## 📡 API 接口

系统需要后端提供以下 API 接口：

### 1. 健康检查
```
GET /api/health
Response: { success: boolean, message: string }
```

### 2. 检查已上传分片
```
POST /api/check-chunks
Body: { fileId: string, md5: string }
Response: { 
  success: boolean, 
  data: { uploadedChunks: number[], needUpload: boolean } 
}
```

### 3. 上传分片
```
POST /api/upload-chunk
Body: FormData {
  fileId: string,
  chunkIndex: string,
  chunkSize: string,
  md5: string,
  fileName: string,
  chunk: File
}
Response: { success: boolean, message: string }
```

### 4. 完成上传
```
POST /api/complete-upload
Body: { fileId: string, fileName: string, md5: string }
Response: { 
  success: boolean, 
  data: { fileName: string, fileSize: number, filePath: string, md5: string } 
}
```

## 🎯 功能特性详解

### 断点续传
- 文件上传前计算 MD5 值作为唯一标识
- 上传前检查服务器已有分片
- 只上传缺失的分片，节省时间和带宽
- 支持暂停和恢复上传

### 分片上传
- 大文件自动分片处理
- 支持并发上传多个分片
- 失败分片自动重试
- 实时显示上传进度

### MD5 校验
- Web Worker 后台计算，不阻塞 UI
- 确保文件完整性
- 支持大文件 MD5 计算

### 用户体验
- 拖拽上传支持
- 实时进度显示
- 上传速度和剩余时间估算
- 响应式设计适配移动端

## 🔍 状态管理

使用 Zustand 进行状态管理，主要状态包括：

```typescript
interface UploadStore {
  files: UploadFile[]           // 文件列表
  serverStatus: ServerStatus    // 服务器状态
  config: UploadConfig         // 上传配置
  stats: UploadStats           // 统计信息
  isUploading: boolean         // 是否正在上传
  
  // 操作方法
  addFiles: (files: File[]) => void
  startUpload: (id: string) => void
  pauseUpload: (id: string) => void
  // ... 更多方法
}
```

## 🎨 样式系统

### 主题配置
在 `src/theme/index.ts` 中定义主题变量：
- 颜色系统
- 间距系统
- 字体系统
- 阴影系统
- 断点系统

### 全局样式
`src/styles/GlobalStyle.ts` 包含：
- 基础样式重置
- Ant Design 自定义样式
- 响应式样式
- 动画样式

## 🧪 开发指南

### 添加新功能
1. 在 `types/upload.ts` 中定义类型
2. 在 `services/uploadService.ts` 中添加服务方法
3. 在 `stores/uploadStore.ts` 中添加状态和操作
4. 在组件中使用状态和服务

### 自定义主题
1. 修改 `src/theme/index.ts` 中的主题变量
2. 在 `src/main.tsx` 中配置 Ant Design 主题
3. 使用 Styled Components 应用自定义样式

### 添加新页面
1. 在 `src/pages/` 中创建页面组件
2. 在 `src/App.tsx` 中添加路由配置

## 📱 浏览器支持

- Chrome >= 88
- Firefox >= 85
- Safari >= 14
- Edge >= 88

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [React](https://reactjs.org/) - UI 框架
- [Ant Design](https://ant.design/) - UI 组件库
- [Vite](https://vitejs.dev/) - 构建工具
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
- [Framer Motion](https://www.framer.com/motion/) - 动画库

---

如有问题或建议，欢迎提交 Issue 或 Pull Request！ 