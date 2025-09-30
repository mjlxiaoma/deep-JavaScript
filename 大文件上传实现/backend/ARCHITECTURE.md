# 后端项目架构文档

## 📁 项目结构

```
backend/
├── src/
│   ├── config/              # 配置文件
│   │   └── index.js        # 统一配置入口
│   ├── controllers/        # 控制器层
│   │   └── uploadController.js
│   ├── routes/             # 路由层
│   │   └── upload.js
│   ├── services/           # 业务逻辑层
│   │   └── uploadService.js
│   ├── middlewares/        # 中间件
│   │   ├── errorHandler.js    # 错误处理
│   │   └── requestLogger.js   # 请求日志
│   ├── validators/         # 数据验证
│   │   └── uploadValidator.js
│   ├── utils/              # 工具函数
│   │   ├── logger.js          # 日志工具
│   │   └── response.js        # 响应工具
│   └── app.js              # 应用主文件
├── chunks/                 # 分片临时存储
├── uploads/                # 最终文件存储
├── logs/                   # 日志文件
├── database-mysql.js       # MySQL数据库类
├── server.js              # 旧版服务器入口
├── server-new.js          # 新版服务器入口（MVC架构）
├── .env                   # 环境变量配置
└── package.json           # 项目依赖

```

## 🏗️ 架构设计

### 1. **分层架构（MVC模式）**

#### **Controller 层（控制器）**
- 职责：处理HTTP请求和响应
- 文件：`src/controllers/uploadController.js`
- 功能：
  - 接收请求参数
  - 调用Service层处理业务
  - 返回统一格式的响应

#### **Service 层（服务）**
- 职责：封装业务逻辑
- 文件：`src/services/uploadService.js`
- 功能：
  - 文件分片管理
  - 数据库操作
  - 文件系统操作
  - 业务规则实现

#### **Route 层（路由）**
- 职责：定义API路由和中间件
- 文件：`src/routes/upload.js`
- 功能：
  - 路由映射
  - 参数验证
  - 权限控制

#### **Model 层（数据模型）**
- 职责：数据库交互
- 文件：`database-mysql.js`
- 功能：
  - 数据库连接
  - CRUD操作
  - 数据持久化

### 2. **核心模块说明**

#### **配置模块 (`src/config/`)**
```javascript
// 统一管理所有配置
- 服务器配置（端口、主机、环境）
- 数据库配置（MySQL/SQLite）
- 上传配置（分片大小、并发数）
- CORS配置
- 日志配置
- 清理任务配置
- JWT配置（用户认证）
- 限流配置
```

#### **工具模块 (`src/utils/`)**

**1. Logger（日志工具）**
```javascript
logger.info('信息日志')
logger.warn('警告日志')
logger.error('错误日志', error)
logger.debug('调试日志')  // 仅开发环境
```

**2. Response（响应工具）**
```javascript
Response.success(res, data, message)         // 成功响应
Response.error(res, message, statusCode)     // 失败响应
Response.paginate(res, data, total, page)    // 分页响应
Response.created(res, data)                  // 创建成功
Response.notFound(res)                       // 404
Response.unauthorized(res)                   // 401
Response.serverError(res, error)             // 500
```

#### **中间件模块 (`src/middlewares/`)**

**1. 错误处理中间件**
- 全局错误捕获
- Multer错误处理
- 数据库错误处理
- JWT错误处理
- 404处理

**2. 请求日志中间件**
- 记录所有请求
- 响应时间统计
- 错误追踪

#### **验证模块 (`src/validators/`)**
- 检查分片请求验证
- 上传分片请求验证
- 完成上传请求验证
- 文件扩展名验证

## 📡 API 接口

### 1. **健康检查**
```http
GET /api/health
```

### 2. **检查已上传分片**
```http
POST /api/check-chunks
Content-Type: application/json

{
  "md5": "文件MD5哈希",
  "fileName": "文件名",
  "totalChunks": 100,
  "fileSize": 1024000
}
```

### 3. **上传分片**
```http
POST /api/upload-chunk
Content-Type: multipart/form-data

{
  "chunk": File,
  "md5": "文件MD5",
  "fileName": "文件名",
  "chunkIndex": 0,
  "totalChunks": 100
}
```

### 4. **完成上传**
```http
POST /api/complete-upload
Content-Type: application/json

{
  "md5": "文件MD5",
  "fileName": "文件名",
  "totalChunks": 100
}
```

### 5. **取消上传**
```http
DELETE /api/cancel/:fileId
```

### 6. **删除文件**
```http
DELETE /api/delete/:fileId
```

### 7. **获取上传历史**
```http
GET /api/uploads/history?page=1&pageSize=10&status=completed
```

### 8. **获取统计信息**
```http
GET /api/database/stats
```

### 9. **获取日志**
```http
GET /api/logs?page=1&pageSize=50&level=error
```

## 🔧 扩展开发指南

### 添加新的API接口

#### 1. **创建控制器方法**
```javascript
// src/controllers/yourController.js
class YourController {
  async yourMethod(req, res, next) {
    try {
      // 处理逻辑
      Response.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}
```

#### 2. **创建服务方法**
```javascript
// src/services/yourService.js
class YourService {
  async yourBusinessLogic() {
    // 业务逻辑
    return result;
  }
}
```

#### 3. **添加路由**
```javascript
// src/routes/your.js
router.get('/your-endpoint', controller.yourMethod.bind(controller));
```

#### 4. **添加验证器（可选）**
```javascript
// src/validators/yourValidator.js
const validateYourRequest = (req, res, next) => {
  // 验证逻辑
  next();
};
```

#### 5. **在app.js中注册路由**
```javascript
// src/app.js
const yourRouter = require('./routes/your');
this.app.use('/api', yourRouter);
```

### 添加新的中间件

```javascript
// src/middlewares/yourMiddleware.js
const yourMiddleware = (req, res, next) => {
  // 中间件逻辑
  next();
};

module.exports = yourMiddleware;
```

### 添加新的数据库方法

```javascript
// database-mysql.js
async yourDatabaseMethod() {
  const [rows] = await this.pool.query('SELECT ...');
  return rows;
}
```

## 🚀 启动方式

### 旧版本（单文件）
```bash
node server.js
```

### 新版本（MVC架构）
```bash
node server-new.js
```

### 开发模式（自动重启）
```bash
npm install -g nodemon
nodemon server-new.js
```

## 📝 环境变量配置

在 `.env` 文件中配置：

```env
# 服务器配置
PORT=3000
HOST=localhost
NODE_ENV=development

# 数据库配置
DATABASE_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=upload_system

# 上传配置
CHUNK_SIZE=2097152
MAX_FILE_SIZE=10737418240
MAX_CONCURRENT_UPLOADS=3
ALLOWED_EXTENSIONS=jpg,png,pdf,zip,mp4

# CORS配置
CORS_ORIGIN=*

# 日志配置
LOG_LEVEL=info
LOG_MAX_FILES=100
LOG_MAX_SIZE=10485760

# 清理配置
CLEANUP_ENABLED=true
CLEANUP_INTERVAL=86400000
RETENTION_DAYS=7

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# 限流配置
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## 🔒 安全建议

1. **环境变量**：不要将 `.env` 提交到版本控制
2. **JWT密钥**：使用强随机密钥
3. **文件验证**：限制文件类型和大小
4. **限流**：防止API滥用
5. **CORS**：生产环境设置特定域名
6. **SQL注入**：使用参数化查询
7. **错误信息**：生产环境不暴露详细错误

## 📊 性能优化

1. **数据库连接池**：复用数据库连接
2. **流式处理**：大文件使用流式读写
3. **并发控制**：限制同时上传数量
4. **定时清理**：自动清理过期数据
5. **日志轮转**：定期清理旧日志
6. **缓存策略**：缓存常用数据

## 🧪 测试建议

### 单元测试
```bash
npm install --save-dev jest
npm test
```

### API测试
使用 Postman 或编写测试脚本：

```javascript
// test/api.test.js
const request = require('supertest');
const app = require('../src/app');

describe('Upload API', () => {
  it('should check chunks', async () => {
    const response = await request(app)
      .post('/api/check-chunks')
      .send({ md5: 'test', fileName: 'test.txt', totalChunks: 1 });
    
    expect(response.status).toBe(200);
  });
});
```

## 📚 依赖说明

### 核心依赖
- `express`: Web框架
- `mysql2`: MySQL驱动
- `multer`: 文件上传处理
- `cors`: 跨域资源共享
- `dotenv`: 环境变量加载

### 可选依赖
- `jsonwebtoken`: JWT认证
- `express-rate-limit`: 限流
- `helmet`: 安全头部
- `compression`: 响应压缩
- `pm2`: 生产环境进程管理

## 🎯 未来扩展方向

1. **用户认证系统**
   - 用户注册/登录
   - JWT令牌管理
   - 权限控制

2. **文件管理功能**
   - 文件列表查看
   - 文件下载
   - 文件分享
   - 文件夹管理

3. **高级功能**
   - 文件压缩
   - 图片缩略图
   - 视频转码
   - 文件预览

4. **集成服务**
   - OSS对象存储
   - CDN加速
   - Redis缓存
   - 消息队列

5. **监控和运维**
   - 性能监控
   - 错误追踪
   - 日志分析
   - 健康检查

---

**作者**: AI Assistant  
**创建日期**: 2025-01-20  
**版本**: 2.0.0 