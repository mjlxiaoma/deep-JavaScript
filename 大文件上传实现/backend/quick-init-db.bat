@echo off
echo ==========================================
echo MySQL数据库快速初始化
echo ==========================================
echo.

echo [信息] 准备初始化文件上传系统数据库...
echo.

echo [提示] 请确保：
echo   ✓ MySQL服务器已启动
echo   ✓ 知道MySQL root密码
echo   ✓ 已安装mysql命令行工具
echo.

set /p confirm=是否继续初始化？(y/n): 
if /i not "%confirm%"=="y" (
    echo 取消初始化
    exit /b 0
)

echo.
echo [执行] 正在运行数据库初始化脚本...
echo [文件] init-database.sql
echo.

REM 检查SQL文件是否存在
if not exist "init-database.sql" (
    echo [错误] 找不到 init-database.sql 文件
    echo [提示] 请确保在正确的目录下运行此脚本
    pause
    exit /b 1
)

REM 执行SQL初始化脚本
mysql -u root -p < init-database.sql

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo ✅ 数据库初始化成功！
    echo ==========================================
    echo.
    echo 📋 创建的内容：
    echo   🗄️ 数据库: file_upload
    echo   👤 用户: upload_user
    echo   🔑 密码: upload123456
    echo   📊 表: uploads, chunks, upload_stats, logs
    echo   🔗 索引: 已优化查询性能
    echo   🔐 权限: 已正确配置
    echo.
    echo 🔧 下一步操作：
    echo   1. 配置 .env 文件
    echo   2. 运行 npm start 启动服务器
    echo   3. 测试数据库连接
    echo.
    echo 🧪 测试命令：
    echo   node test-mysql.js
    echo.
    
    REM 询问是否创建.env文件
    set /p create_env=是否现在创建 .env 配置文件？(y/n): 
    if /i "%create_env%"=="y" (
        echo.
        echo [创建] .env 配置文件...
        (
            echo DB_HOST=localhost
            echo DB_PORT=3306
            echo DB_USER=upload_user
            echo DB_PASSWORD=upload123456
            echo DB_NAME=file_upload
            echo DATABASE_TYPE=mysql
        ) > .env
        echo [成功] .env 文件已创建
        echo.
    )
    
    REM 询问是否运行测试
    set /p run_test=是否现在运行数据库测试？(y/n): 
    if /i "%run_test%"=="y" (
        echo.
        echo [测试] 运行数据库连接测试...
        node test-mysql.js
        echo.
    )
    
) else (
    echo.
    echo ==========================================
    echo ❌ 数据库初始化失败
    echo ==========================================
    echo.
    echo 💡 可能的原因：
    echo   1. MySQL服务器未启动
    echo   2. root密码错误
    echo   3. 权限不足
    echo   4. MySQL路径未配置
    echo.
    echo 🔧 解决方案：
    echo   1. 检查MySQL服务状态
    echo   2. 验证root密码
    echo   3. 在Navicat中手动执行SQL脚本
    echo.
)

echo ==========================================
echo 📚 参考文档
echo ==========================================
echo   📖 详细文档: DATABASE-INIT.md
echo   🔧 SQL脚本: init-database.sql
echo   🧪 测试工具: test-mysql.js
echo.

pause 