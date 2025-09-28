@echo off
echo =================================
echo Vue3 断点续传上传系统 - 开发模式
echo =================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js 版本:
node --version

REM 检查npm依赖
if not exist node_modules (
    echo [信息] 正在安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] 依赖安装完成
    echo.
)

echo [信息] 启动开发服务器...
echo [信息] 前端地址: http://localhost:5173
echo [信息] 请确保后端服务运行在 http://localhost:3000
echo [信息] 按 Ctrl+C 停止服务器
echo.

REM 启动Vite开发服务器
npm run dev

pause 