# TechBlo 博客平台

一个基于 Next.js 和 Node.js 的现代化博客平台，支持 GitHub OAuth 登录。

## 项目结构

```
boke/
├── boke_web/          # Next.js 前端应用
└── boke_server/       # Node.js 后端服务
```

## 快速开始

### 1. 安装前端依赖

```bash
cd boke_web
npm install
```

### 2. 安装后端依赖

```bash
cd boke_server
npm install
```

### 3. 配置后端环境变量

```bash
cd boke_server
cp env.example .env
```

编辑 `.env` 文件，配置以下内容：

- `GITHUB_CLIENT_ID`: GitHub OAuth App 的 Client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App 的 Client Secret
- `SESSION_SECRET`: Session 密钥（随机字符串）
- `JWT_SECRET`: JWT 密钥（随机字符串）

### 4. 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写以下信息：
   - Application name: TechBlo
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3001/api/auth/github/callback
4. 复制 Client ID 和 Client Secret 到 `.env` 文件

### 5. 启动服务

**启动后端服务：**
```bash
cd boke_server
npm run dev
```

后端服务将在 http://localhost:3001 启动

**启动前端服务：**
```bash
cd boke_web
npm run dev
```

前端应用将在 http://localhost:3000 启动

## 功能特性

- ✅ 美观的登录/注册页面
- ✅ GitHub OAuth 登录
- ✅ 用户名/密码登录和注册
- ✅ JWT 认证
- ✅ 博客主页面展示
- ✅ 响应式设计
- ✅ TypeScript 支持

## 技术栈

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Axios

### 后端
- Node.js
- Express
- Passport.js (GitHub OAuth)
- JWT
- bcryptjs

## 注意事项

- 当前使用内存存储用户数据，生产环境应使用真实数据库（如 MongoDB、PostgreSQL）
- Session 在生产环境应使用安全配置（HTTPS）
- 在生产环境中应配置 CORS 策略
- 建议使用环境变量管理敏感信息

## 开发建议

1. 生产环境应使用数据库存储用户和博客数据
2. 添加输入验证和错误处理
3. 实现博客文章的 CRUD 操作
4. 添加用户头像上传功能
5. 实现博客搜索和筛选功能
6. 添加评论功能

