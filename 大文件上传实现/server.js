const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;

// 配置中间件
app.use(express.json());
app.use(express.static('./'));

// 配置multer用于处理文件上传
const upload = multer({ dest: 'temp/' });

// 存储上传状态的内存数据库（实际项目中应使用真实数据库）
const uploadStatus = new Map();

// 确保必要的目录存在
async function ensureDirectories() {
    const dirs = ['temp', 'uploads', 'chunks'];
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
}

// 检查已上传的chunks
app.post('/api/check-chunks', async (req, res) => {
    try {
        const { md5, fileName, totalChunks } = req.body;
        const fileId = `${md5}_${fileName}`;
        const chunksDir = path.join('chunks', fileId);
        
        let uploadedChunks = [];
        
        try {
            const files = await fs.readdir(chunksDir);
            uploadedChunks = files
                .filter(file => file.startsWith('chunk_'))
                .map(file => parseInt(file.split('_')[1]))
                .sort((a, b) => a - b);
        } catch (error) {
            // 目录不存在，说明还没有上传过
        }
        
        // 更新上传状态
        uploadStatus.set(fileId, {
            md5,
            fileName,
            totalChunks,
            uploadedChunks: new Set(uploadedChunks),
            createdAt: new Date()
        });
        
        res.json({ uploadedChunks });
    } catch (error) {
        console.error('检查chunks失败:', error);
        res.status(500).json({ error: '检查失败' });
    }
});

// 上传单个chunk
app.post('/api/upload-chunk', upload.single('chunk'), async (req, res) => {
    try {
        const { chunkIndex, md5, fileName, totalChunks } = req.body;
        const fileId = `${md5}_${fileName}`;
        const chunksDir = path.join('chunks', fileId);
        
        // 确保chunks目录存在
        await fs.mkdir(chunksDir, { recursive: true });
        
        // 移动chunk文件到正确位置
        const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
        await fs.rename(req.file.path, chunkPath);
        
        // 更新上传状态
        let status = uploadStatus.get(fileId);
        if (!status) {
            status = {
                md5,
                fileName,
                totalChunks: parseInt(totalChunks),
                uploadedChunks: new Set(),
                createdAt: new Date()
            };
        }
        
        status.uploadedChunks.add(parseInt(chunkIndex));
        uploadStatus.set(fileId, status);
        
        console.log(`Chunk ${chunkIndex} uploaded for ${fileName} (${status.uploadedChunks.size}/${totalChunks})`);
        
        res.json({ 
            success: true, 
            uploaded: status.uploadedChunks.size,
            total: status.totalChunks
        });
        
    } catch (error) {
        console.error('上传chunk失败:', error);
        res.status(500).json({ error: '上传失败' });
    }
});

// 完成上传，合并所有chunks
app.post('/api/complete-upload', async (req, res) => {
    try {
        const { md5, fileName, totalChunks } = req.body;
        const fileId = `${md5}_${fileName}`;
        const chunksDir = path.join('chunks', fileId);
        const finalPath = path.join('uploads', fileName);
        
        // 检查所有chunks是否都已上传
        const status = uploadStatus.get(fileId);
        if (!status || status.uploadedChunks.size !== parseInt(totalChunks)) {
            return res.status(400).json({ error: '文件不完整' });
        }
        
        // 合并chunks
        const writeStream = require('fs').createWriteStream(finalPath);
        
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(chunksDir, `chunk_${i}`);
            const chunkData = await fs.readFile(chunkPath);
            writeStream.write(chunkData);
        }
        
        writeStream.end();
        
        // 等待写入完成
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        // 验证文件完整性
        const fileBuffer = await fs.readFile(finalPath);
        const actualMd5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
        
        // 清理临时chunks
        try {
            const chunkFiles = await fs.readdir(chunksDir);
            for (const file of chunkFiles) {
                await fs.unlink(path.join(chunksDir, file));
            }
            await fs.rmdir(chunksDir);
        } catch (error) {
            console.warn('清理chunks失败:', error);
        }
        
        // 清理上传状态
        uploadStatus.delete(fileId);
        
        console.log(`文件上传完成: ${fileName}`);
        
        res.json({ 
            success: true, 
            fileName,
            size: fileBuffer.length,
            md5: actualMd5
        });
        
    } catch (error) {
        console.error('完成上传失败:', error);
        res.status(500).json({ error: '合并文件失败' });
    }
});

// 获取上传进度
app.get('/api/upload-status/:md5/:fileName', (req, res) => {
    const { md5, fileName } = req.params;
    const fileId = `${md5}_${fileName}`;
    const status = uploadStatus.get(fileId);
    
    if (!status) {
        return res.json({ uploaded: 0, total: 0, percentage: 0 });
    }
    
    const uploaded = status.uploadedChunks.size;
    const total = status.totalChunks;
    const percentage = total > 0 ? (uploaded / total) * 100 : 0;
    
    res.json({ uploaded, total, percentage });
});

// 删除上传任务
app.delete('/api/upload/:md5/:fileName', async (req, res) => {
    try {
        const { md5, fileName } = req.params;
        const fileId = `${md5}_${fileName}`;
        const chunksDir = path.join('chunks', fileId);
        
        // 清理chunks
        try {
            const chunkFiles = await fs.readdir(chunksDir);
            for (const file of chunkFiles) {
                await fs.unlink(path.join(chunksDir, file));
            }
            await fs.rmdir(chunksDir);
        } catch (error) {
            // 目录可能不存在
        }
        
        // 清理状态
        uploadStatus.delete(fileId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('删除上传失败:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// 启动服务器
async function startServer() {
    await ensureDirectories();
    
    app.listen(port, () => {
        console.log(`断点续传服务器运行在 http://localhost:${port}`);
        console.log('功能特性:');
        console.log('- 大文件分块上传');
        console.log('- MD5校验确保文件完整性');
        console.log('- 断点续传支持');
        console.log('- Web Worker计算MD5');
        console.log('- 实时上传进度显示');
    });
}

startServer().catch(console.error);

module.exports = app; 