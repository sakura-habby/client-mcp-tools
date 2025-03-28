const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8484;

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`MCP客户端运行在 http://localhost:${PORT}`);
}); 