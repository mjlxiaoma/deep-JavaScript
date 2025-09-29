@echo off
echo ==========================================
echo MySQL数据库配置向导
echo ==========================================
echo.

echo [信息] 正在安装MySQL依赖...
npm install mysql2 dotenv

if %errorlevel% neq 0 (
    echo [错误] MySQL依赖安装失败
    pause
    exit /b 1
)

echo [成功] MySQL依赖安装完成！
echo.

echo ==========================================
echo 数据库配置
echo ==========================================
echo.
echo 请按照以下步骤配置MySQL数据库：
echo.
echo 1️⃣ 确保MySQL服务器已安装并运行
echo    - 下载地址: https://dev.mysql.com/downloads/mysql/
echo    - 或使用XAMPP: https://www.apachefriends.org/
echo.

echo 2️⃣ 创建数据库和用户（可选）
echo    - 登录MySQL: mysql -u root -p
echo    - 创建数据库: CREATE DATABASE file_upload CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
echo    - 创建用户: CREATE USER 'upload_user'@'localhost' IDENTIFIED BY 'your_password';
echo    - 授权: GRANT ALL PRIVILEGES ON file_upload.* TO 'upload_user'@'localhost';
echo    - 刷新权限: FLUSH PRIVILEGES;
echo.

echo 3️⃣ 配置环境变量
echo    请复制 env.example 文件为 .env 并修改数据库配置
echo.

echo [询问] 是否现在配置环境变量? (y/n)
set /p config_env=

if /i "%config_env%"=="y" (
    echo.
    echo [配置] 数据库连接信息
    echo.
    
    set /p db_host=数据库主机 (默认: localhost): 
    if "%db_host%"=="" set db_host=localhost
    
    set /p db_port=数据库端口 (默认: 3306): 
    if "%db_port%"=="" set db_port=3306
    
    set /p db_name=数据库名称 (默认: file_upload): 
    if "%db_name%"=="" set db_name=file_upload
    
    set /p db_user=数据库用户名 (默认: root): 
    if "%db_user%"=="" set db_user=root
    
    set /p db_password=数据库密码: 
    
    echo.
    echo [创建] .env 配置文件...
    
    (
        echo # MySQL数据库配置
        echo DB_HOST=%db_host%
        echo DB_PORT=%db_port%
        echo DB_USER=%db_user%
        echo DB_PASSWORD=%db_password%
        echo DB_NAME=%db_name%
        echo.
        echo # 数据库类型
        echo DATABASE_TYPE=mysql
        echo.
        echo # 服务器配置
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # 上传配置
        echo MAX_FILE_SIZE=10737418240
        echo CHUNK_SIZE=2097152
        echo UPLOAD_PATH=./uploads
        echo TEMP_PATH=./temp
        echo CHUNKS_PATH=./chunks
        echo.
        echo # 安全配置
        echo ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4174,http://localhost:8080
        echo.
        echo # 日志配置
        echo LOG_LEVEL=info
        echo LOG_RETENTION_DAYS=30
        echo.
        echo # 清理配置
        echo CLEANUP_FAILED_UPLOADS_DAYS=1
        echo CLEANUP_OLD_LOGS_DAYS=30
    ) > .env
    
    echo [成功] .env 文件创建完成！
    echo.
)

echo ==========================================
echo 测试数据库连接
echo ==========================================
echo.
echo [询问] 是否现在测试数据库连接? (y/n)
set /p test_db=

if /i "%test_db%"=="y" (
    echo [测试] 启动服务器进行连接测试...
    echo [提示] 服务器将启动，如果连接成功会显示相关信息
    echo [提示] 按 Ctrl+C 停止测试
    echo.
    pause
    node server.js
)

echo.
echo ==========================================
echo 配置完成
echo ==========================================
echo.
echo ✅ MySQL数据库配置完成！
echo.
echo 📋 配置信息:
echo   - 数据库类型: MySQL
echo   - 依赖包: mysql2, dotenv
echo   - 配置文件: .env
echo   - 连接池: 支持
echo   - 事务: 支持
echo.
echo 🚀 启动命令:
echo   npm start
echo.
echo 📊 数据库特性:
echo   ✅ 支持大并发访问
echo   ✅ 事务保证数据一致性
echo   ✅ 自动创建数据库和表
echo   ✅ 连接池管理
echo   ✅ 自动重连机制
echo   ✅ UTF8MB4字符集支持
echo.
echo 🔧 管理工具推荐:
echo   - phpMyAdmin (Web界面)
echo   - MySQL Workbench (官方工具)
echo   - HeidiSQL (Windows)
echo   - Sequel Pro (macOS)
echo.

pause 