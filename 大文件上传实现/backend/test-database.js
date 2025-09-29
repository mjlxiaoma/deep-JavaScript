const UploadDatabase = require('./database');

console.log('📊 测试数据库功能...\n');

// 初始化数据库
const db = new UploadDatabase();

async function testDatabase() {
  try {
    console.log('1️⃣ 测试创建上传记录...');
    
    const fileId = 'test123_example.zip';
    const fileName = 'example.zip';
    const fileSize = 1048576; // 1MB
    const md5 = 'test123';
    const totalChunks = 10;
    const clientInfo = {
      ip: '127.0.0.1',
      userAgent: 'TestAgent/1.0'
    };
    
    // 开始上传
    const started = db.startUpload(fileId, fileName, fileSize, md5, totalChunks, clientInfo);
    console.log(`   ✅ 创建上传记录: ${started}`);
    
    console.log('\n2️⃣ 测试记录分片上传...');
    
    // 模拟上传分片
    for (let i = 0; i < 5; i++) {
      const chunkSize = Math.floor(fileSize / totalChunks);
      db.recordChunk(fileId, i, chunkSize);
      console.log(`   📤 记录分片 ${i}: ${chunkSize} bytes`);
    }
    
    console.log('\n3️⃣ 测试获取上传信息...');
    
    const uploadInfo = db.getUploadInfo(fileId);
    if (uploadInfo) {
      console.log(`   📊 文件名: ${uploadInfo.file_name}`);
      console.log(`   📊 进度: ${uploadInfo.progress}% (${uploadInfo.uploadedChunks.length}/${uploadInfo.total_chunks})`);
      console.log(`   📊 状态: ${uploadInfo.status}`);
      console.log(`   📊 上传速度: ${uploadInfo.upload_speed} chunks/秒`);
    }
    
    console.log('\n4️⃣ 测试完成上传...');
    
    // 模拟上传剩余分片
    for (let i = 5; i < totalChunks; i++) {
      const chunkSize = Math.floor(fileSize / totalChunks);
      db.recordChunk(fileId, i, chunkSize);
    }
    
    // 完成上传
    const finalPath = '/uploads/example.zip';
    const actualMd5 = 'test123';
    const completed = db.completeUpload(fileId, finalPath, actualMd5, fileSize);
    console.log(`   ✅ 完成上传: ${completed}`);
    
    console.log('\n5️⃣ 测试获取统计信息...');
    
    const stats = db.getStats(7);
    console.log('   📈 统计信息:');
    console.log(`   - 活跃上传: ${stats.current.activeUploads}`);
    console.log(`   - 今日完成: ${stats.current.completedToday}`);
    console.log(`   - 今日失败: ${stats.current.failedToday}`);
    console.log(`   - 历史记录: ${stats.daily.length} 天`);
    
    console.log('\n6️⃣ 测试获取日志...');
    
    const logs = db.getLogs(10);
    console.log(`   📝 最近日志 (${logs.length} 条):`);
    logs.slice(0, 3).forEach(log => {
      console.log(`   [${log.level}] ${log.message}`);
    });
    
    console.log('\n7️⃣ 测试错误处理...');
    
    // 测试失败上传
    const failedFileId = 'failed123_test.zip';
    db.startUpload(failedFileId, 'test.zip', 1000, 'failed123', 5, clientInfo);
    db.failUpload(failedFileId, '测试错误');
    console.log('   ❌ 模拟失败上传记录');
    
    console.log('\n✅ 数据库功能测试完成！');
    console.log('\n📊 数据库文件位置: ./data/uploads.db');
    console.log('💡 可以使用SQLite浏览器工具查看数据库内容');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭数据库连接
    db.close();
  }
}

// 运行测试
testDatabase(); 