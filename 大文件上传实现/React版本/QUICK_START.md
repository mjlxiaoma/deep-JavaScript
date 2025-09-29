# 🚀 React 上传系统 - 快速开始

## 📋 前置要求

- Node.js >= 16.0.0
- npm >= 7.0.0 (或 yarn >= 1.22.0)
- 现代浏览器 (Chrome >= 88, Firefox >= 85, Safari >= 14)

## ⚡ 快速启动

### 方法一：一键启动（推荐）

```bash
# 双击运行启动脚本
start-dev.bat
```

### 方法二：命令行启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问
# http://localhost:5173
```

## 🌐 访问地址

- **前端**: http://localhost:5173
- **后端API**: http://localhost:3000/api

## 🔧 开发环境配置

### 1. 检查Node.js版本
```bash
node --version
# 应该显示 v16.0.0 或更高版本
```

### 2. 检查依赖安装
```bash
npm list --depth=0
# 应该显示所有依赖包
```

### 3. 检查端口占用
```bash
# Windows
netstat -ano | findstr :5173

# macOS/Linux  
lsof -i :5173
```

## 📁 项目结构说明

```
React版本/
├── src/                    # 源代码目录
│   ├── components/         # 可复用组件
│   ├── pages/             # 页面组件
│   │   └── UploadPage.tsx # 主上传页面
│   ├── services/          # 服务层
│   │   └── uploadService.ts # 上传服务
│   ├── stores/            # 状态管理
│   │   └── uploadStore.ts # Zustand状态
│   ├── styles/            # 样式文件
│   ├── types/             # TypeScript类型
│   ├── theme/             # 主题配置
│   ├── App.tsx            # 根组件
│   └── main.tsx           # 入口文件
├── public/                # 静态资源
├── package.json           # 项目配置
├── vite.config.ts         # Vite配置
├── tsconfig.json          # TypeScript配置
└── start-dev.bat          # 启动脚本
```

## 🎯 核心功能

### ✅ 已实现功能

- [x] 文件拖拽上传
- [x] 大文件分片上传
- [x] 断点续传
- [x] MD5文件校验
- [x] 实时进度显示
- [x] 上传速度统计
- [x] 错误处理和重试
- [x] 批量操作
- [x] 响应式设计

### 🎨 界面特性

- [x] Ant Design 现代化UI
- [x] Framer Motion 流畅动画
- [x] 深色/浅色主题支持
- [x] 移动端适配
- [x] 拖拽区域高亮

## 🔧 配置选项

### 上传配置

在 `src/types/upload.ts` 中修改：

```typescript
export const UPLOAD_CONSTANTS = {
  DEFAULT_CHUNK_SIZE: 2 * 1024 * 1024,    // 分片大小: 2MB
  MAX_CONCURRENT_UPLOADS: 3,               // 并发数: 3
  MAX_RETRIES: 3,                         // 重试次数: 3
  REQUEST_TIMEOUT: 30000,                 // 超时: 30秒
  MAX_FILE_SIZE: 10 * 1024 * 1024 * 1024 // 最大: 10GB
}
```

### Vite代理配置

在 `vite.config.ts` 中修改：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // 后端地址
      changeOrigin: true,
    }
  }
}
```

## 🐛 常见问题

### Q1: 启动时显示 "找不到模块"
```bash
# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### Q2: 端口5173被占用
```bash
# 方法1: 修改端口
npm run dev -- --port 5174

# 方法2: 杀死占用进程
# Windows: netstat -ano | findstr :5173
# 然后: taskkill /PID [PID号] /F
```

### Q3: 上传失败 "服务器连接失败"
- 确保后端服务器在 http://localhost:3000 运行
- 检查防火墙和代理设置
- 查看浏览器控制台网络请求

### Q4: TypeScript 编译错误
```bash
# 检查TypeScript配置
npm run type-check

# 重新生成类型定义
rm -rf node_modules/@types
npm install
```

### Q5: 样式显示异常
- 清除浏览器缓存
- 检查Ant Design版本兼容性
- 确保Styled Components正常加载

## 🔗 相关链接

### 技术文档
- [React 官方文档](https://reactjs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Ant Design 文档](https://ant.design/)
- [TypeScript 文档](https://www.typescriptlang.org/)

### 依赖库
- [Zustand 状态管理](https://github.com/pmndrs/zustand)
- [Framer Motion 动画](https://www.framer.com/motion/)
- [Axios HTTP客户端](https://axios-http.com/)
- [SparkMD5 哈希计算](https://github.com/satazor/js-spark-md5)

## 📞 技术支持

如果遇到问题：

1. 📖 查看 [README.md](./README.md) 详细文档
2. 🐛 检查 [常见问题](#-常见问题) 部分
3. 🔍 在项目中搜索相关错误信息
4. 💬 提交 Issue 描述问题

## 🎉 开始使用

现在你可以：

1. ✅ 启动开发服务器
2. 🌐 访问 http://localhost:5173
3. 📁 拖拽文件到上传区域
4. ⚡ 体验断点续传功能
5. 📊 查看实时上传进度

祝你使用愉快！ 🚀 