# TechBlo 快速启动指南

## 前置要求

- Node.js 18+ 
- npm 或 yarn
- GitHub 账号（用于 OAuth）

## 快速启动步骤

### 1. 安装依赖

**前端：**
```bash
cd boke_web
npm install
```

**后端：**
```bash
cd boke_server
npm install
```

### 2. 配置 GitHub OAuth

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写以下信息：
   - **Application name**: TechBlo
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3001/api/auth/github/callback
4. 点击 "Register application"
5. 复制 **Client ID** 和 **Client Secret**
   - 这些值会在创建 OAuth App 后显示在页面上
   - **重要**：Client Secret 只会显示一次，请务必保存好
   - 如果丢失了 Client Secret，需要重新生成

### 3. 配置后端环境变量

```bash
cd boke_server
cp env.example .env
```

编辑 `.env` 文件：

```env
PORT=3001
SESSION_SECRET=your-random-secret-key-here
JWT_SECRET=your-random-jwt-secret-here
GITHUB_CLIENT_ID=你的GitHub_Client_ID
GITHUB_CLIENT_SECRET=你的GitHub_Client_Secret
```

**生成随机密钥：**
```bash
# 在Node.js中运行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 启动服务

**启动后端（在第一个终端）：**
```bash
cd boke_server
npm run dev
```

后端将在 http://localhost:3001 启动

**启动前端（在第二个终端）：**
```bash
cd boke_web
npm run dev
```

前端将在 http://localhost:3000 启动

### 5. 访问应用

打开浏览器访问 http://localhost:3000

## 功能测试

### 测试 GitHub 登录

1. 点击 "使用 GitHub 登录" 按钮
2. 授权 GitHub 应用
3. 应该自动跳转到博客主页面

### 测试用户名/密码登录

1. 先注册一个新账号
2. 使用注册的用户名和密码登录
3. 应该成功跳转到博客主页面

## 常见问题

### 1. GitHub OAuth 回调失败

- 检查 `.env` 文件中的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 是否正确
- 检查 GitHub OAuth App 的回调 URL 是否为：`http://localhost:3001/api/auth/github/callback`

### 2. 前端无法连接后端

- 确保后端服务正在运行（http://localhost:3001）
- 检查 `boke_web/next.config.js` 中的代理配置

### 3. 端口已被占用

- 修改 `boke_server/.env` 中的 `PORT` 值
- 同时更新 `boke_web/next.config.js` 中的代理地址

## 开发建议

1. 使用两个终端窗口分别运行前后端
2. 后端日志会显示请求信息，便于调试
3. 前端使用 Next.js 热重载，修改代码会自动刷新
4. 建议使用 Chrome DevTools 查看网络请求和错误

