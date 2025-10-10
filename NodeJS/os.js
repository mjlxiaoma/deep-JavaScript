const os = require("os"); // 和 import 语法类似
function getSystemInfo() {
  //获取系统信息
  return {
    platform: os.platform(), //操作系统平台
    type: os.type(), //操作系统类型
    architecture: os.arch(), //操作系统架构
    cpuCount: os.cpus().length, //cpu数量
    cpuModel: os.cpus()[0].model, //cpu型号
    totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024), //内存
    hostname: os.hostname(), //主机名
  };
}

const systemInfo = getSystemInfo();
console.log(systemInfo);
