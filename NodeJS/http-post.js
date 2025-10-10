const http = require("http");
/**
 *  启动 HTTP 服务，监听端口
    Request Reponse
    method
    url
    获取 Request body
    返回数据
 */

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 设置响应头为 JSON 格式
  res.setHeader("Content-Type", "application/json");

  // 检查是否为 POST 请求且路由为 /api/user
  if (req.method === "POST" && req.url === "/api/user") {
    let body = "";

    // 接收数据
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // 数据接收完成
    req.on("end", () => {
      try {
        // 解析 JSON 数据
        const userData = JSON.parse(body);

        // 打印接收到的数据
        console.log("接收到的用户数据:", userData);
        console.log("userId:", userData.userId);
        console.log("name:", userData.name);
        console.log("email:", userData.email);

        // TODO...

        // 返回成功响应
        const response = {
          status: "success",
        };

        res.statusCode = 200;
        res.end(JSON.stringify(response));
      } catch (error) {
        // 如果 JSON 解析失败，返回错误
        const response = {
          status: "error",
          message: "无效的 JSON 数据",
        };

        res.statusCode = 400;
        res.end(JSON.stringify(response));
      }
    });
  } else {
    // 其他请求返回简单提示
    const response = {
      message: "请发送 POST 请求到 /api/user",
    };

    res.end(JSON.stringify(response));
  }
});

// 监听 3000 端口
server.listen(3000, () => {
  console.log("HTTP 服务器已启动，监听端口: 3000");
  console.log("POST 请求地址: http://localhost:3000/api/user");
});
