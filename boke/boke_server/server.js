import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import GitHubStrategy from 'passport-github2';
import JwtStrategy from 'passport-jwt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }, // 生产环境应设为 true (HTTPS)
}));

app.use(passport.initialize());
app.use(passport.session());

// 模拟数据库（实际应使用真实数据库）
const users = [];
const posts = [
  {
    id: 1,
    title: 'JavaScript 异步编程深度解析',
    content: '异步编程是JavaScript的核心特性之一。本文将深入探讨Promise、async/await以及事件循环机制...',
    author: 'TechBlo团队',
    createdAt: '2025-01-15',
    views: 1250,
    likes: 89,
  },
  {
    id: 2,
    title: 'React Hooks 最佳实践指南',
    content: 'React Hooks 为我们提供了更优雅的函数组件开发方式。本文分享一些实用的最佳实践和常见陷阱...',
    author: 'TechBlo团队',
    createdAt: '2025-01-14',
    views: 980,
    likes: 67,
  },
  {
    id: 3,
    title: 'Node.js 性能优化实战',
    content: '在大规模应用中，Node.js的性能优化至关重要。本文将介绍一些实用的优化技巧和工具...',
    author: 'TechBlo团队',
    createdAt: '2025-01-13',
    views: 756,
    likes: 54,
  },
  {
    id: 4,
    title: 'TypeScript 高级类型系统',
    content: 'TypeScript的类型系统非常强大，本文将深入探讨泛型、条件类型、映射类型等高级特性...',
    author: 'TechBlo团队',
    createdAt: '2025-01-12',
    views: 634,
    likes: 42,
  },
  {
    id: 5,
    title: '微前端架构设计与实现',
    content: '微前端是一种将多个独立的前端应用组合成一个整体的架构模式。本文将介绍其设计思路和实现方案...',
    author: 'TechBlo团队',
    createdAt: '2025-01-11',
    views: 523,
    likes: 38,
  },
];

// GitHub OAuth 配置
const githubClientID = process.env.GITHUB_CLIENT_ID || 'your-github-client-id';
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret';
const githubCallbackURL = 'http://localhost:3001/api/auth/github/callback';

// 验证 GitHub OAuth 配置
if (githubClientID === 'your-github-client-id' || githubClientSecret === 'your-github-client-secret') {
  console.warn('⚠️  警告: GitHub OAuth 配置未设置！请在 .env 文件中配置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET');
}

console.log('GitHub OAuth 配置:');
console.log('  Client ID:', githubClientID);
console.log('  Callback URL:', githubCallbackURL);
console.log('  Client Secret:', githubClientSecret ? '***已设置***' : '未设置');

passport.use(new GitHubStrategy({
  clientID: githubClientID,
  clientSecret: githubClientSecret,
  callbackURL: githubCallbackURL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // 查找或创建用户
    let user = users.find(u => u.githubId === profile.id);
    
    if (!user) {
      user = {
        id: users.length + 1,
        githubId: profile.id,
        username: profile.username,
        name: profile.displayName || profile.username,
        email: profile.emails?.[0]?.value || '',
        avatar: profile.photos?.[0]?.value || '',
        provider: 'github',
      };
      users.push(user);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// JWT 策略
passport.use(new JwtStrategy.Strategy({
  jwtFromRequest: JwtStrategy.ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret-change-this',
}, (payload, done) => {
  const user = users.find(u => u.id === payload.id);
  if (user) {
    return done(null, user);
  }
  return done(null, false);
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// 生成 JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || 'your-jwt-secret-change-this',
    { expiresIn: '7d' }
  );
};

// 认证中间件
const authenticate = passport.authenticate('jwt', { session: false });

// 路由

// GitHub OAuth 路由
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/?error=auth_failed' }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`http://localhost:3000/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
  }
);

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log(req.body,'body');
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写所有字段' });
    }
    
    // 检查用户是否已存在
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建新用户
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      name: username,
      avatar: '',
      provider: 'local',
    };
    
    users.push(newUser);
    
    const token = generateToken(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '注册失败，请重试' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '请填写所有字段' });
    }
    
    // 查找用户（支持用户名或邮箱登录）
    const user = users.find(u => 
      u.username === username || u.email === username
    );
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 检查密码
    if (user.provider === 'local' && user.password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: '用户名或密码错误' });
      }
    } else if (user.provider === 'github') {
      return res.status(401).json({ message: '该账号使用GitHub登录，请使用GitHub登录' });
    }
    
    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '登录失败，请重试' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticate, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// 获取博客列表
app.get('/api/posts', authenticate, (req, res) => {
  res.json({ posts });
});

// 获取单个博客文章
app.get('/api/posts/:id', authenticate, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) {
    return res.status(404).json({ message: '文章不存在' });
  }
  res.json({ post });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n✅ 服务器运行在 http://localhost:${PORT}`);
  console.log(`✅ GitHub OAuth 回调地址: http://localhost:${PORT}/api/auth/github/callback`);
  console.log(`\n📝 请确保在 GitHub OAuth App 中配置的回调 URL 为: ${githubCallbackURL}`);
  console.log(`   GitHub OAuth App 配置地址: https://github.com/settings/developers\n`);
});

