# MCP PDF分析系统

## 项目简介

MCP PDF分析系统是一个基于Node.js的应用程序，用于分析PDF文档并提取其中的内容。该系统由服务器端和客户端组成，客户端将PDF文件传送给服务器端，服务器端通过Kimi API解析PDF内容（包括文字和图像），然后返回详细的文字描述。

## 功能特点

- 上传PDF文件（如需求文档）进行分析
- 利用Kimi API进行PDF内容的智能解析
- 支持解析PDF中的文字和图像内容
- 提供友好的Web界面
- 基于Node.js构建的高效服务

## 系统要求

- Node.js 12.0.0 或更高版本
- Windows、MacOS 或 Linux 操作系统
- 有效的Kimi API密钥
- 网络连接

## 安装步骤

### 解决PowerShell执行策略问题（Windows用户）

如果您在Windows系统上运行时遇到PowerShell执行策略限制，请使用以下方法之一解决：

**方法1：临时更改执行策略（推荐）**
1. 以管理员身份打开PowerShell
2. 运行命令：`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
3. 继续安装过程

**方法2：使用命令提示符(CMD)**
1. 打开命令提示符而不是PowerShell
2. 继续安装过程

### 服务器端安装

1. 进入服务器目录：
   ```
   cd D:\WorkSpace\mcp\PDFDemo\server
   ```

2. 安装依赖：
   ```
   npm install
   ```

## 安装客户端

1. 进入客户端目录：
   ```
   cd D:\WorkSpace\mcp\PDFDemo\client
   ```

2. 删除node_modules目录：
   ```
   rmdir /s /q node_modules
   ```

3. 安装依赖：
   ```
   npm install
   ```

4. 启动客户端：
   ```
   npm start
   ```

## 完整步骤总结

1. 为服务器安装依赖
2. 确认`.env`文件已配置（已经配置完成，如果需要更新Kimi API密钥，可以随时编辑）
3. 启动服务器
4. 为客户端安装依赖
5. 启动客户端

完成这些步骤后，您就可以通过浏览器访问http://localhost:8484使用MCP PDF分析系统了。

## 客户端无法访问的解决方案

根据我的检查，您无法访问http://localhost:8484的原因可能有以下几种：

### 可能的原因和解决方法

#### 1. 客户端可能没有正确启动

**解决方法**：
- 确保您已经安装了客户端依赖
- 在命令提示符(CMD)中运行以下命令（避免PowerShell执行策略问题）：
  ```
  cd D:\WorkSpace\mcp\PDFDemo\client
  npm install
  npm start
  ```
- 查看命令窗口中是否有错误信息
- 确认是否看到"MCP客户端运行在 http://localhost:8484"的提示

#### 2. 端口8484可能被占用

**解决方法**：
- 可以修改客户端的端口
- 编辑`client/index.js`文件：
  ```javascript
  const PORT = process.env.PORT || 3001; // 改为其他未被占用的端口
  ```
- 重新启动客户端

#### 3. 客户端依赖可能没有正确安装

**解决方法**：
- 可以尝试重新安装依赖
- 在CMD中执行：
  ```
  cd D:\WorkSpace\mcp\PDFDemo\client
  rmdir /s /q node_modules
  npm install
  ```

#### 4. express模块可能无法正确加载

**解决方法**：
- 可以尝试全局安装express：
  ```
  npm install -g express
  ```
- 然后重新启动客户端

#### 5. 查看客户端启动日志

当您运行客户端时，请注意查看控制台输出的任何错误信息，这可以帮助我们确定具体问题。

## 其他建议

如果上述方法都无法解决问题，您可以尝试：

1. **直接访问网页文件**：
   浏览本地文件：`file:///D:/WorkSpace/mcp/PDFDemo/client/public/index.html`
   (这样虽然能查看界面，但无法与服务器交互)

2. **检查服务状态**：
   - 确认服务器(3000端口)是否正常运行
   - 尝试访问：http://localhost:3000 看是否有响应

3. **检查防火墙设置**：
   - 检查Windows防火墙是否阻止了Node.js应用程序

如果您能提供客户端启动时的完整错误信息，我可以提供更具体的解决方案。