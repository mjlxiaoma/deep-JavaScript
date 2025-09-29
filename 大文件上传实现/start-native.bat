@echo off
echo ==========================================
echo 原生JS 断点续传启动脚本
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

REM 启动后端服务器
echo [信息] 启动后端服务器...
start "后端服务器" cmd /k "cd backend && npm start"

REM 等待3秒让后端服务器启动
echo [等待] 后端服务器启动中...
timeout /t 3 /nobreak >nul

REM 使用Python启动简单的HTTP服务器来服务index.html
echo [信息] 启动原生JS前端...

REM 检查Python是否可用
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [信息] 使用Python启动HTTP服务器...
    start "原生JS前端" cmd /k "python -m http.server 8080"
    set "FRONTEND_URL=http://localhost:8080"
) else (
    REM 检查Python3是否可用
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [信息] 使用Python3启动HTTP服务器...
        start "原生JS前端" cmd /k "python3 -m http.server 8080"
        set "FRONTEND_URL=http://localhost:8080"
    ) else (
        REM 使用Node.js的http-server
        echo [信息] 使用Node.js http-server...
        npx http-server . -p 8080 -o >nul 2>&1
        if %errorlevel% equ 0 (
            start "原生JS前端" cmd /k "npx http-server . -p 8080"
            set "FRONTEND_URL=http://localhost:8080"
        ) else (
            echo [警告] 无法启动HTTP服务器，请手动打开index.html
            echo [提示] 或者安装Python后重新运行此脚本
            set "FRONTEND_URL=file:///index.html"
        )
    )
)

echo.
echo [成功] 正在启动服务...
echo [后端] http://localhost:3000
echo [前端] %FRONTEND_URL%
echo [文件] %CD%\index.html
echo.
echo [重要] 原生版本需要通过HTTP服务器访问，不能直接双击index.html
echo [原因] 需要避免CORS跨域问题
echo.

REM 等待2秒后自动打开浏览器
timeout /t 2 /nobreak >nul
start "" "%FRONTEND_URL%"

echo [提示] 浏览器应该已经自动打开
echo [提示] 关闭此窗口不会停止服务，请在各自窗口中按Ctrl+C停止
echo.

pause 