const fs = require("fs");
const path = require("path");
//在 file 目录下创建 data.txt 文件
// 定义文件路径
const fileDir = path.join(__dirname, "./file");
const filePath = path.join(fileDir, "data.txt"); // 功能1: 在 /file 目录下创建 data.txt 文件并写入内容
function createAndWriteFile() {
  // 确保文件目录存在，否则先目录和文件
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true }); // 创建目录和文件
    console.log("创建目录:", fileDir);
  }
  const content = 'hello world'
  // 写入文件内容
  fs.writeFileSync(filePath, content, "utf8"); // 写入内容
  console.log("文件创建成功:", filePath);
  console.log("写入内容:", content);
}

createAndWriteFile();


// 功能2: 读取文件内容
function readFile() {
  try {
    const data = fs.readFileSync(filePath, 'utf8') // 读取文件内容
    console.log('读取的文件内容:', data)
    return data
  } catch (error) {
    console.error('读取文件失败:', error.message)
    return null
  }
}
readFile()
