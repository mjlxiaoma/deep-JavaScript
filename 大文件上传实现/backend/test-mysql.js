require('dotenv').config();
const MySQLUploadDatabase = require('./database-mysql');

console.log('📊 测试MySQL数据库功能...\n');

async function testMySQL() {
  let db;
  
  try {
    console.log('1️⃣ 初始化MySQL数据库...');
    
    db = new MySQLUploadDatabase();
    
    // 等待初始化完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('   ✅ MySQL数据库初始化完成');
    
    console.log('\n2️⃣ 测试健康检查...');
    
    const healthCheck = await db.healthCheck();
    console.log(`   💗 健康检查: ${healthCheck ? '通过' : '失败'}`);
    
    if (!healthCheck) {
      throw new Error('数据库连接失败');
    }
    
    console.log('\n3️⃣ 测试创建上传记录...');
    
    const fileId = 'mysql_test_' + Date.now() + '_example.zip';
    const fileName = 'mysql_example.zip';
    const fileSize = 1048576; // 1MB
    const md5 = 'mysql_test_' + Date.now();
    const totalChunks = 10;
    const clientInfo = {
      ip: '127.0.0.1',
      userAgent: 'MySQL-Test/1.0'
    };
    
    const started = await db.startUpload(fileId, fileName, fileSize, md5, totalChunks, clientInfo);
    console.log(`   ✅ 创建上传记录: ${started}`);
    
    console.log('\n4️⃣ 测试记录分片上传...');
    
    // 模拟上传分片
    for (let i = 0; i < 5; i++) {
      const chunkSize = Math.floor(fileSize / totalChunks);
      const success = await db.recordChunk(fileId, i, chunkSize);
      console.log(`   📤 记录分片 ${i}: ${success ? '成功' : '失败'} (${chunkSize} bytes)`);
    }
    
    console.log('\n5️⃣ 测试获取上传信息...');
    
    const uploadInfo = await db.getUploadInfo(fileId);
    if (uploadInfo) {
      console.log(`   📊 文件名: ${uploadInfo.file_name}`);
      console.log(`   📊 进度: ${uploadInfo.progress}% (${uploadInfo.uploadedChunks.length}/${uploadInfo.total_chunks})`);
      console.log(`   📊 状态: ${uploadInfo.status}`);
      console.log(`   📊 上传速度: ${uploadInfo.upload_speed} chunks/秒`);
      console.log(`   📊 开始时间: ${uploadInfo.start_time}`);
    } else {
      console.log('   ❌ 获取上传信息失败');
    }
    
    console.log('\n6️⃣ 测试完成上传...');
    
    // 模拟上传剩余分片
    for (let i = 5; i < totalChunks; i++) {
      const chunkSize = Math.floor(fileSize / totalChunks);
      await db.recordChunk(fileId, i, chunkSize);
    }
    
    // 完成上传
    const finalPath = '/uploads/mysql_example.zip';
    const actualMd5 = md5;
    const completed = await db.completeUpload(fileId, finalPath, actualMd5, fileSize);
    console.log(`   ✅ 完成上传: ${completed}`);
    
    console.log('\n7️⃣ 测试获取统计信息...');
    
    const stats = await db.getStats(7);
    console.log('   📈 统计信息:');
    console.log(`   - 活跃上传: ${stats.current.activeUploads}`);
    console.log(`   - 今日完成: ${stats.current.completedToday}`);
    console.log(`   - 今日失败: ${stats.current.failedToday}`);
    console.log(`   - 历史记录: ${stats.daily.length} 天`);
    
    if (stats.daily.length > 0) {
      const today = stats.daily[0];
      console.log(`   - 今日统计: 总计${today.total_uploads}次，成功${today.successful_uploads}次，失败${today.failed_uploads}次`);
    }
    
    console.log('\n8️⃣ 测试获取上传历史...');
    
    const history = await db.getUploadHistory('completed', 5);
    console.log(`   📋 上传历史 (${history.length} 条):`);
    history.slice(0, 3).forEach((upload, index) => {
      console.log(`   ${index + 1}. ${upload.file_name} - ${upload.status} (${upload.file_size} bytes)`);
    });
    
    console.log('\n9️⃣ 测试获取日志...');
    
    const logs = await db.getLogs(10);
    console.log(`   📝 最近日志 (${logs.length} 条):`);
    logs.slice(0, 3).forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.level}] ${log.message}`);
    });
    
    console.log('\n🔟 测试错误处理...');
    
    // 测试失败上传
    const failedFileId = 'mysql_failed_' + Date.now() + '_test.zip';
    await db.startUpload(failedFileId, 'failed_test.zip', 1000, 'failed_' + Date.now(), 5, clientInfo);
    const failed = await db.failUpload(failedFileId, 'MySQL测试错误');
    console.log(`   ❌ 模拟失败上传记录: ${failed}`);
    
    console.log('\n1️⃣1️⃣ 测试清理功能...');
    
    await db.cleanup();
    console.log('   🧹 清理任务执行完成');
    
    console.log('\n✅ MySQL数据库功能测试完成！');
    console.log('\n📊 数据库连接信息:');
    console.log(`   - 主机: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   - 端口: ${process.env.DB_PORT || 3306}`);
    console.log(`   - 数据库: ${process.env.DB_NAME || 'file_upload'}`);
    console.log(`   - 用户: ${process.env.DB_USER || 'root'}`);
    console.log('\n💡 可以使用MySQL客户端工具查看数据库内容');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决方案:');
      console.log('   1. 确保MySQL服务器正在运行');
      console.log('   2. 检查连接配置 (.env文件)');
      console.log('   3. 验证用户名和密码');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('   1. 数据库不存在，请先创建数据库');
      console.log('   2. 或运行服务器让其自动创建');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('   1. 检查用户名和密码');
      console.log('   2. 确保用户有足够的权限');
      console.log('   3. 检查MySQL用户配置');
    }
  } finally {
    // 关闭数据库连接
    if (db) {
      await db.close();
    }
  }
}

// 运行测试
testMySQL(); 