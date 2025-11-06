# GitHub OAuth 404 错误快速修复指南

## 🚨 问题描述

点击 GitHub 登录按钮后，跳转到 GitHub 授权页面时出现 404 错误。

## 🔍 问题原因

404 错误通常是由以下原因造成的：

1. **GitHub OAuth App 的回调 URL 配置错误**（最常见）
2. GitHub OAuth App 的 Client ID 或 Client Secret 不正确
3. 环境变量未正确配置
4. 服务器未运行

## ✅ 快速修复步骤

### 1. 检查 GitHub OAuth App 配置

访问 https://github.com/settings/developers，找到你的 OAuth App：

**必须确保以下配置正确：**

- **Application name**: TechBlo（或任意名称）
- **Homepage URL**: `http://localhost:3000`（前端地址）
- **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback` ⚠️ **这很重要！**

**回调 URL 必须完全匹配：**
- ✅ 正确：`http://localhost:3001/api/auth/github/callback`
- ❌ 错误：`http://localhost:3000/api/auth/github/callback`（端口错误）
- ❌ 错误：`http://localhost:3001/github/callback`（路径错误）
- ❌ 错误：`https://localhost:3001/api/auth/github/callback`（协议错误）
- ❌ 错误：`http://127.0.0.1:3001/api/auth/github/callback`（主机名错误）

### 2. 检查环境变量配置

确保 `boke_server/.env` 文件存在并包含正确的配置：

```env
PORT=3001
SESSION_SECRET=your-session-secret-key-change-this
JWT_SECRET=your-jwt-secret-key-change-this
GITHUB_CLIENT_ID=你的GitHub_Client_ID
GITHUB_CLIENT_SECRET=你的GitHub_Client_Secret
```

**如何获取 GitHub OAuth App 的 Client ID 和 Secret：**

1. 访问 https://github.com/settings/developers
2. 点击你的 OAuth App
3. 在 "Client ID" 字段中复制 Client ID
4. 点击 "Generate a new client secret" 生成新的 Secret（或使用现有的）

### 3. 重启后端服务器

修改配置后，必须重启后端服务器：

```bash
# 停止当前服务器（Ctrl+C）
cd boke_server
npm start
```

服务器启动时会显示配置信息，检查是否有警告。

### 4. 运行配置检查脚本

运行配置检查脚本来验证配置：

```bash
cd boke_server
node check-github-config.js
```

该脚本会检查：
- 环境变量是否配置
- 回调 URL 是否正确
- 服务器是否运行

## 🧪 测试步骤

1. **确保后端服务器正在运行**（端口 3001）
   ```bash
   curl http://localhost:3001/api/health
   # 应该返回: {"status":"ok","message":"Server is running"}
   ```

2. **确保前端服务器正在运行**（端口 3000）
   - 访问 http://localhost:3000

3. **点击 GitHub 登录按钮**
   - 应该跳转到 GitHub 授权页面（不是 404 错误）
   - 授权后应该跳转回前端页面

## 🔧 常见错误和解决方案

### 错误 1: 回调 URL 配置错误

**症状**: 跳转到 GitHub 授权页面时出现 404 错误

**解决方案**: 
- 检查 GitHub OAuth App 中的 "Authorization callback URL" 是否设置为 `http://localhost:3001/api/auth/github/callback`
- 确保完全匹配，包括协议、主机、端口和路径

### 错误 2: Client ID 或 Secret 错误

**症状**: 服务器启动时显示警告，或 GitHub 授权后无法跳转

**解决方案**:
- 检查 `.env` 文件中的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 是否正确
- 确保从 GitHub OAuth App 页面复制的值正确
- 注意不要复制错误的值（Client ID 通常较短，Client Secret 较长）

### 错误 3: 服务器未运行

**症状**: 无法访问后端 API

**解决方案**:
- 确保后端服务器在端口 3001 运行
- 检查是否有端口冲突
- 查看服务器启动日志是否有错误

### 错误 4: 环境变量未加载

**症状**: 服务器使用默认配置值

**解决方案**:
- 确保 `.env` 文件在 `boke_server` 目录下
- 确保文件名是 `.env`（不是 `env.example`）
- 修改 `.env` 后必须重启服务器

## 📝 调试技巧

1. **查看后端服务器日志**
   - 启动服务器时会显示 GitHub OAuth 配置信息
   - 检查是否有警告或错误信息

2. **查看浏览器控制台**
   - 打开开发者工具（F12）
   - 查看 Network 标签页，检查请求的 URL 和响应
   - 查看 Console 标签页，检查是否有错误信息

3. **测试 GitHub OAuth 端点**
   ```bash
   # 直接访问 GitHub OAuth 端点
   curl http://localhost:3001/api/auth/github
   # 应该返回 302 重定向到 GitHub
   ```

4. **检查 GitHub OAuth App 状态**
   - 确保 OAuth App 是 "Active" 状态
   - 检查是否有任何限制或错误提示

## 🎯 完整配置示例

### GitHub OAuth App 配置

```
Application name: TechBlo
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3001/api/auth/github/callback
```

### .env 文件配置

```env
PORT=3001
SESSION_SECRET=your-session-secret-key-change-this
JWT_SECRET=your-jwt-secret-key-change-this
GITHUB_CLIENT_ID=Ov231iSY12pLKUGt13uZ
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 📞 仍然无法解决？

如果按照以上步骤仍然无法解决问题，请检查：

1. 防火墙或安全软件是否阻止了端口 3001
2. 是否有其他服务占用了端口 3001
3. GitHub OAuth App 是否被禁用或删除
4. 网络连接是否正常

