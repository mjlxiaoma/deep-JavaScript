// 测试环境变量加载
console.log('=== 环境变量测试 ===');
console.log('当前工作目录:', process.cwd());

// 在加载dotenv之前检查
console.log('加载dotenv之前:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

// 加载dotenv
require('dotenv').config();

console.log('加载dotenv之后:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE);

// 检查.env文件是否存在
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env');

console.log('.env文件路径:', envPath);
console.log('.env文件存在:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('.env文件内容:');
  console.log(content);
} 