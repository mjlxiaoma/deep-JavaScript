@echo off
echo ==========================================
echo 断点续传后端服务器启动脚本
echo ==========================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js版本:
node --version

REM 检查依赖是否安装
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

echo [信息] 启动后端服务器...
echo [地址] http://localhost:3000
echo [健康] http://localhost:3000/api/health
echo [统计] http://localhost:3000/api/stats
echo.
echo [支持] Vue3前端: http://localhost:5173
echo [支持] React前端: http://localhost:4174
echo.
echo [提示] 按 Ctrl+C 停止服务器
echo.

REM 启动服务器
npm start

pause 