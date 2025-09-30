/**
 * 服务器入口文件
 * 使用新的MVC架构
 */
const App = require('./src/app');

const app = new App();
app.start(); 