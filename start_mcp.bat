@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

:: 设置路径
set "BASE_DIR=%~dp0"
set "SERVER_DIR=%BASE_DIR%server"
set "CLIENT_DIR=%BASE_DIR%client"
set "SERVER_PORT=3000"
set "CLIENT_PORT=8484"

echo 正在启动MCP PDF分析系统...
echo.

:: 检查并关闭可能正在运行的Node.js进程
echo 检查并关闭已有的MCP服务...
:: 关闭占用3000端口的进程(服务器)
for /f "tokens=5" %%a in ('netstat -ano ^| find ":%SERVER_PORT% "') do (
    echo 正在关闭服务器进程(PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

:: 关闭占用8484端口的进程(客户端)
for /f "tokens=5" %%a in ('netstat -ano ^| find ":%CLIENT_PORT% "') do (
    echo 正在关闭客户端进程(PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

:: 检查目录是否存在
if not exist "%SERVER_DIR%" (
    echo 错误：未找到服务器目录 %SERVER_DIR%
    pause
    goto :eof
)

if not exist "%CLIENT_DIR%" (
    echo 错误：未找到客户端目录 %CLIENT_DIR%
    pause
    goto :eof
)

:: 启动服务器（在新的窗口中）
echo 正在启动服务器...
start "MCP Server" cmd /k "cd /d "%SERVER_DIR%" & echo 正在安装服务器依赖... & call npm install & echo 启动服务器... & call npm start"

:: 等待一段时间确保服务器已经启动
timeout /t 10 /nobreak > nul

:: 启动客户端（在新的窗口中）
echo 正在启动客户端...
start "MCP Client" cmd /k "cd /d "%CLIENT_DIR%" & echo 正在安装客户端依赖... & call npm install & echo 启动客户端... & call npm start"

echo.
echo MCP PDF分析系统正在启动...
echo 服务器地址: http://localhost:%SERVER_PORT%
echo 客户端地址: http://localhost:%CLIENT_PORT%
echo.
echo 请在浏览器中访问客户端地址: http://localhost:%CLIENT_PORT%
echo 两个命令窗口都必须保持打开状态，关闭窗口将终止相应的服务
echo.

:: 保持窗口打开
pause