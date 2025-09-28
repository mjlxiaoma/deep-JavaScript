@echo off
echo 断点续传文件上传系统启动脚本
echo ================================

REM 检查是否已安装Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 检查并安装依赖...
if not exist node_modules (
    echo 正在安装npm依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 安装依赖失败
        pause
        exit /b 1
    )
)

echo 启动服务器...
echo 服务器地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

REM 自动打开浏览器
start http://localhost:3000

REM 启动Node.js服务器
npm start

pause 