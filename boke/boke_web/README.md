# TechBlo 前端应用

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 3. 构建生产版本

```bash
npm run build
npm start
```

## 功能特性

- ✅ 登录/注册页面（参考设计图）
- ✅ GitHub OAuth 登录
- ✅ 用户名/密码登录
- ✅ 博客主页面
- ✅ 响应式设计
- ✅ TypeScript 支持
- ✅ Tailwind CSS 样式

## 项目结构

```
boke_web/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 登录页面
│   ├── blog/
│   │   └── page.tsx        # 博客主页面
│   └── auth/
│       └── callback/
│           └── page.tsx    # OAuth 回调页面
├── components/
│   ├── LoginPage.tsx       # 登录页面组件
│   └── BlogPage.tsx        # 博客页面组件
└── ...
```

## 环境变量

前端无需配置环境变量，后端API地址在 `next.config.js` 中配置。

