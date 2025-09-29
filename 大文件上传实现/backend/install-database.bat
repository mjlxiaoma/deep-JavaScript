@echo off
echo ==========================================
echo 安装数据库依赖
echo ==========================================
echo.

echo [信息] 正在安装SQLite数据库依赖...
npm install sqlite3 better-sqlite3

if %errorlevel% neq 0 (
    echo [错误] 数据库依赖安装失败
    echo [提示] 可能需要安装Python和C++编译工具
    echo [提示] 运行: npm install --global windows-build-tools
    pause
    exit /b 1
)

echo [成功] 数据库依赖安装完成！
echo.
echo [信息] 数据库功能已启用，服务器将自动：
echo   ✅ 持久化存储上传记录
echo   ✅ 记录上传进度和统计
echo   ✅ 保存系统日志
echo   ✅ 支持断点续传恢复
echo   ✅ 定期清理过期数据
echo.
echo [新增API] 以下API已可用：
echo   📊 /api/database/stats - 数据库统计
echo   📝 /api/logs - 系统日志
echo   📋 /api/uploads/history - 上传历史
echo.

pause 