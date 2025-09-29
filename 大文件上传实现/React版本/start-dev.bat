@echo off
echo ==========================================
echo React 断点续传上传系统 - 开发环境启动
echo ==========================================
echo.

echo [信息] 正在启动 React 开发服务器...
echo [端口] http://localhost:5173
echo [代理] /api -> http://localhost:3000
echo.

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo [警告] 未找到 node_modules 目录
    echo [提示] 正在安装依赖...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] 依赖安装完成
    echo.
)

REM 启动开发服务器
echo [启动] 正在启动 Vite 开发服务器...
echo.
npm run dev

if %errorlevel% neq 0 (
    echo.
    echo ==========================================
    echo ❌ 启动失败
    echo ==========================================
    echo.
    echo 💡 可能的原因：
    echo   1. 端口 5173 已被占用
    echo   2. 依赖安装不完整
    echo   3. Node.js 版本不兼容
    echo.
    echo 🔧 解决方案：
    echo   1. 检查端口占用: netstat -ano ^| findstr :5173
    echo   2. 重新安装依赖: npm install
    echo   3. 检查 Node.js 版本: node --version
    echo.
) else (
    echo.
    echo ==========================================
    echo ✅ 开发服务器已启动
    echo ==========================================
    echo.
    echo 🌐 访问地址：
    echo   本地: http://localhost:5173
    echo   网络: http://[你的IP]:5173
    echo.
    echo 🔧 开发工具：
    echo   热重载: 已启用
    echo   TypeScript: 已启用
    echo   ESLint: 已启用
    echo.
)

pause 