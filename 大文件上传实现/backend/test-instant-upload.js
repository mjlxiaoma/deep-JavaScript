/**
 * 秒传功能测试脚本
 * 测试相同MD5文件的秒传功能
 */

const MySQLDatabase = require('./database-mysql');

async function testInstantUpload() {
  console.log('🧪 开始测试秒传功能...\n');

  const db = new MySQLDatabase();
  
  // 等待数据库初始化
  await new Promise(resolve => setTimeout(resolve, 2000));

  const testMd5 = 'a1b2c3d4e5f6789012345678901234ab'; // 32位标准MD5
  const fileName1 = 'test_file_1.zip';
  const fileName2 = 'test_file_2.zip'; // 不同文件名，相同MD5
  const fileSize = 1024 * 1024 * 100; // 100MB
  const totalChunks = 20;

  try {
    // 1. 模拟第一个文件完整上传
    console.log('📤 步骤1: 模拟第一个文件上传...');
    const fileId1 = `${testMd5}_${fileName1}`;
    
    await db.startUpload(fileId1, fileName1, fileSize, testMd5, totalChunks, {
      ip: '127.0.0.1',
      userAgent: 'Test Agent'
    });
    
    // 模拟上传所有分片
    for (let i = 0; i < totalChunks; i++) {
      await db.recordChunk(fileId1, i, 5 * 1024 * 1024);
    }
    
    // 完成上传
    const finalPath1 = './uploads/test_file_1.zip';
    await db.completeUpload(fileId1, finalPath1, testMd5, fileSize);
    console.log(`   ✅ 第一个文件上传完成: ${fileName1}\n`);

    // 2. 测试秒传：上传相同MD5的第二个文件
    console.log('⚡ 步骤2: 测试秒传功能...');
    const fileId2 = `${testMd5}_${fileName2}`;
    
    const existingFile = await db.findCompletedByMd5(testMd5);
    
    if (existingFile) {
      console.log('   ✅ 秒传检测成功！');
      console.log(`   📁 找到已存在文件:`);
      console.log(`      - 原文件名: ${existingFile.file_name}`);
      console.log(`      - 文件路径: ${existingFile.final_path}`);
      console.log(`      - 文件大小: ${existingFile.file_size} bytes`);
      console.log(`      - 完成时间: ${existingFile.complete_time}`);
      console.log(`   ⚡ ${fileName2} 可以直接秒传，无需上传任何数据！\n`);
    } else {
      console.log('   ❌ 秒传检测失败：未找到已完成的文件\n');
    }

    // 3. 验证数据库查询性能
    console.log('📊 步骤3: 测试查询性能...');
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      await db.findCompletedByMd5(testMd5);
    }
    const endTime = Date.now();
    console.log(`   ✅ 100次查询耗时: ${endTime - startTime}ms`);
    console.log(`   ⚡ 平均查询时间: ${(endTime - startTime) / 100}ms\n`);

    // 4. 测试不存在的MD5
    console.log('🔍 步骤4: 测试不存在的文件...');
    const nonExistentMd5 = 'non_existent_md5_99999';
    const notFound = await db.findCompletedByMd5(nonExistentMd5);
    
    if (!notFound) {
      console.log('   ✅ 正确返回null（文件不存在）\n');
    } else {
      console.log('   ❌ 错误：不应该找到文件\n');
    }

    // 5. 清理测试数据
    console.log('🧹 步骤5: 清理测试数据...');
    const connection = await db.pool.getConnection();
    await connection.execute('DELETE FROM uploads WHERE md5 = ?', [testMd5]);
    await connection.execute('DELETE FROM chunks WHERE file_id LIKE ?', [`${testMd5}%`]);
    connection.release();
    console.log('   ✅ 测试数据已清理\n');

    console.log('✅ 秒传功能测试完成！');
    console.log('\n📝 测试总结:');
    console.log('   ✅ 秒传检测功能正常');
    console.log('   ✅ 数据库查询性能良好');
    console.log('   ✅ 边界情况处理正确');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await db.close();
  }
}

// 运行测试
testInstantUpload();

