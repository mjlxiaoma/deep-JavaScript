# ⚡ 快速启动指南

## 🚀 一键启动

**最简单的方式：直接双击 `start-dev.bat` 文件！**

或者在命令行中：

```bash
# Windows PowerShell 或 CMD
cd F:\213\deep-JavaScript\ReactDemo
npm run dev
```

## 🌐 访问项目

启动成功后，浏览器会自动打开，或手动访问：

```
http://localhost:5173
```

## 📋 项目信息

### 版本信息
- React: **19.1.1** (最新版本)
- TypeScript: **5.9.3**
- Vite: **7.1.7**
- Node.js 要求: **>= 20.0.0**

### 项目特点
✅ 使用最新的 React 19 特性  
✅ 完整的 TypeScript 支持  
✅ Vite 超快热更新  
✅ ESLint 代码规范检查  
✅ 开箱即用的配置  

## 🛠️ 常用命令

```bash
# 开发模式（带热更新）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

## 📁 项目结构

```
ReactDemo/
│
├── 📄 start-dev.bat          # 一键启动脚本
├── 📄 package.json           # 项目配置
├── 📄 vite.config.ts         # Vite 配置
├── 📄 tsconfig.json          # TypeScript 配置
│
├── 📂 src/                   # 源代码目录
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 入口文件
│   ├── App.css              # 应用样式
│   └── index.css            # 全局样式
│
├── 📂 public/                # 静态资源
└── 📂 node_modules/          # 依赖包
```

## 🎯 开始开发

### 1. 修改主页面
编辑 `src/App.tsx`:

```tsx
function App() {
  return (
    <div>
      <h1>我的第一个 React 应用！</h1>
    </div>
  )
}
```

### 2. 创建新组件
在 `src/` 下创建 `components/` 目录，添加新组件：

```tsx
// src/components/MyComponent.tsx
export default function MyComponent() {
  return <div>Hello from MyComponent!</div>
}
```

### 3. 使用组件
在 `App.tsx` 中导入使用：

```tsx
import MyComponent from './components/MyComponent'

function App() {
  return <MyComponent />
}
```

## 🎨 添加样式

### CSS Modules
```tsx
// MyComponent.module.css
.container {
  padding: 20px;
}

// MyComponent.tsx
import styles from './MyComponent.module.css'
export default function MyComponent() {
  return <div className={styles.container}>Styled!</div>
}
```

### 普通 CSS
直接在组件中导入：
```tsx
import './MyComponent.css'
```

## 📦 安装新依赖

```bash
# 安装运行时依赖
npm install package-name

# 安装开发依赖
npm install -D package-name

# 例如：安装 React Router
npm install react-router-dom
```

## 🐛 常见问题

### 端口被占用？
修改 `vite.config.ts`:
```ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000  // 改成其他端口
  }
})
```

### 热更新不工作？
1. 确保文件保存了
2. 检查是否有编译错误
3. 重启开发服务器

### TypeScript 报错？
运行类型检查：
```bash
npm run build
```

## 📚 学习资源

- [React 19 文档](https://react.dev)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Vite 指南](https://vite.dev/guide/)

## 💡 下一步

- 学习 React Hooks (useState, useEffect)
- 添加路由 (React Router)
- 状态管理 (Zustand, Redux)
- UI 组件库 (Ant Design, MUI)

---

**祝你开发愉快！** 🎉

