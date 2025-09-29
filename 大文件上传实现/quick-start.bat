@echo off
title 断点续传文件上传 - 选择版本
echo ==========================================
echo      断点续传文件上传系统
echo ==========================================
echo.
echo 请选择要启动的版本:
echo.
echo  [1] 原生JS版本    (最简单，直接使用)
echo  [2] Vue3版本      (现代框架，功能丰富)  
echo  [3] React19版本   (最新React，高性能)
echo  [4] 只启动后端    (仅后端服务)
echo  [0] 退出
echo.
set /p choice=请输入选择 (0-4): 

if "%choice%"=="1" (
    echo.
    echo [启动] 原生JS版本...
    call start-native.bat
) else if "%choice%"=="2" (
    echo.
    echo [启动] Vue3版本...
    call start-vue3.bat
) else if "%choice%"=="3" (
    echo.
    echo [启动] React19版本...
    call start-react.bat
) else if "%choice%"=="4" (
    echo.
    echo [启动] 仅后端服务...
    start "后端服务器" cmd /k "cd backend && npm start"
    echo [完成] 后端服务已启动在 http://localhost:3000
) else if "%choice%"=="0" (
    echo.
    echo 退出...
    exit /b 0
) else (
    echo.
    echo [错误] 无效选择，请重新运行脚本
    pause
    exit /b 1
)

echo.
pause 