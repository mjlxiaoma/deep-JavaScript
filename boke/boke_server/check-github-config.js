/**
 * GitHub OAuth 配置检查脚本
 * 用于验证 GitHub OAuth 配置是否正确
 */

require('dotenv').config();
const axios = require('axios');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = 'http://localhost:3001/api/auth/github/callback';

console.log('🔍 检查 GitHub OAuth 配置...\n');

// 检查环境变量
console.log('1. 环境变量检查:');
if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === 'your-github-client-id') {
  console.error('   ❌ GITHUB_CLIENT_ID 未设置或使用默认值');
  console.error('      请在 .env 文件中设置 GITHUB_CLIENT_ID');
} else {
  console.log(`   ✅ GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}`);
}

if (!GITHUB_CLIENT_SECRET || GITHUB_CLIENT_SECRET === 'your-github-client-secret') {
  console.error('   ❌ GITHUB_CLIENT_SECRET 未设置或使用默认值');
  console.error('      请在 .env 文件中设置 GITHUB_CLIENT_SECRET');
} else {
  console.log(`   ✅ GITHUB_CLIENT_SECRET: ***已设置***`);
}

console.log(`\n2. 回调 URL 配置:`);
console.log(`   ✅ 代码中配置的回调 URL: ${CALLBACK_URL}`);

console.log(`\n3. 需要检查的 GitHub OAuth App 配置:`);
console.log(`   📋 访问: https://github.com/settings/developers`);
console.log(`   📋 找到你的 OAuth App (Client ID: ${GITHUB_CLIENT_ID || '未设置'})`);
console.log(`   📋 确保 "Authorization callback URL" 设置为: ${CALLBACK_URL}`);
console.log(`   ⚠️  回调 URL 必须完全匹配，包括协议 (http)、端口 (3001) 和路径`);

console.log(`\n4. 常见问题:`);
console.log(`   ❌ 回调 URL 配置为 http://localhost:3000/api/auth/github/callback (错误)`);
console.log(`   ❌ 回调 URL 配置为 http://localhost:3001/github/callback (错误)`);
console.log(`   ✅ 回调 URL 配置为 ${CALLBACK_URL} (正确)`);

console.log(`\n5. 测试步骤:`);
console.log(`   1. 确保后端服务器正在运行 (端口 3001)`);
console.log(`   2. 确保前端服务器正在运行 (端口 3000)`);
console.log(`   3. 访问 http://localhost:3000`);
console.log(`   4. 点击 GitHub 登录按钮`);
console.log(`   5. 应该跳转到 GitHub 授权页面，而不是 404 错误`);

// 测试服务器是否运行
console.log(`\n6. 测试服务器连接:`);
axios.get('http://localhost:3001/api/health')
  .then(response => {
    console.log('   ✅ 后端服务器正在运行');
  })
  .catch(error => {
    console.error('   ❌ 后端服务器未运行或无法访问');
    console.error('      请运行: cd boke_server && npm start');
  });

