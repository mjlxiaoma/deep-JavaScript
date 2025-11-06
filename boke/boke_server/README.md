# TechBlo 后端服务

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下内容：

- `PORT`: 服务器端口（默认 3001）
- `SESSION_SECRET`: Session 密钥（随机字符串）
- `JWT_SECRET`: JWT 密钥（随机字符串）
- `GITHUB_CLIENT_ID`: GitHub OAuth App 的 Client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App 的 Client Secret

### 3. 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写以下信息：
   - Application name: TechBlo
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3001/api/auth/github/callback
4. 复制 Client ID 和 Client Secret 到 `.env` 文件

### 4. 启动服务器

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API 接口

### 认证接口

- `GET /api/auth/github` - GitHub OAuth 登录
- `GET /api/auth/github/callback` - GitHub OAuth 回调
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

### 博客接口

- `GET /api/posts` - 获取博客列表（需要认证）
- `GET /api/posts/:id` - 获取单个博客文章（需要认证）

## 注意事项

- 当前使用内存存储用户数据，生产环境应使用真实数据库
- Session 在生产环境应使用安全配置（HTTPS）
- JWT Secret 应使用强随机字符串

