#!/bin/bash

echo "正在启动MCP PDF分析系统..."
echo ""

# 设置路径
SERVER_DIR="server"
CLIENT_DIR="client"
SERVER_PORT=3000
CLIENT_PORT=8484

# 检查并关闭可能正在运行的Node.js进程
echo "检查并关闭已有的MCP服务..."

# 关闭占用服务器端口的进程
if command -v lsof &> /dev/null; then
    # 如果有lsof命令
    SERVER_PIDS=$(lsof -ti:$SERVER_PORT)
    if [ ! -z "$SERVER_PIDS" ]; then
        echo "正在关闭服务器进程(PID: $SERVER_PIDS)"
        kill -9 $SERVER_PIDS 2>/dev/null
    fi
    
    CLIENT_PIDS=$(lsof -ti:$CLIENT_PORT)
    if [ ! -z "$CLIENT_PIDS" ]; then
        echo "正在关闭客户端进程(PID: $CLIENT_PIDS)"
        kill -9 $CLIENT_PIDS 2>/dev/null
    fi
elif command -v netstat &> /dev/null; then
    # 如果有netstat命令
    SERVER_PIDS=$(netstat -tulpn 2>/dev/null | grep $SERVER_PORT | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$SERVER_PIDS" ]; then
        echo "正在关闭服务器进程(PID: $SERVER_PIDS)"
        kill -9 $SERVER_PIDS 2>/dev/null
    fi
    
    CLIENT_PIDS=$(netstat -tulpn 2>/dev/null | grep $CLIENT_PORT | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$CLIENT_PIDS" ]; then
        echo "正在关闭客户端进程(PID: $CLIENT_PIDS)"
        kill -9 $CLIENT_PIDS 2>/dev/null
    fi
else
    echo "无法检测占用端口的进程，请手动确保端口 $SERVER_PORT 和 $CLIENT_PORT 未被占用"
fi

# 检查目录是否存在
if [ ! -d "$SERVER_DIR" ]; then
    echo "错误：未找到服务器目录 $SERVER_DIR"
    exit 1
fi

if [ ! -d "$CLIENT_DIR" ]; then
    echo "错误：未找到客户端目录 $CLIENT_DIR"
    exit 1
fi

# 启动服务器（在新的终端窗口中）
echo "正在启动服务器..."

# 根据不同的操作系统启动新终端
if [ "$(uname)" == "Darwin" ]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd \\\"$PWD/$SERVER_DIR\\\" && echo 正在安装服务器依赖... && npm install && echo 启动服务器... && npm start\""
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd \"$PWD/$SERVER_DIR\" && echo 正在安装服务器依赖... && npm install && echo 启动服务器... && npm start; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd \"$PWD/$SERVER_DIR\" && echo 正在安装服务器依赖... && npm install && echo 启动服务器... && npm start; exec bash" &
    else
        echo "无法找到合适的终端模拟器，请手动启动服务器。"
        echo "命令: cd \"$PWD/$SERVER_DIR\" && npm install && npm start"
    fi
else
    echo "未知的操作系统，请手动启动服务器。"
    echo "命令: cd \"$PWD/$SERVER_DIR\" && npm install && npm start"
fi

# 等待几秒钟确保服务器已经启动
sleep 5

# 启动客户端（在新的终端窗口中）
echo "正在启动客户端..."

# 根据不同的操作系统启动新终端
if [ "$(uname)" == "Darwin" ]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd \\\"$PWD/$CLIENT_DIR\\\" && echo 正在安装客户端依赖... && npm install && echo 启动客户端... && npm start\""
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd \"$PWD/$CLIENT_DIR\" && echo 正在安装客户端依赖... && npm install && echo 启动客户端... && npm start; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd \"$PWD/$CLIENT_DIR\" && echo 正在安装客户端依赖... && npm install && echo 启动客户端... && npm start; exec bash" &
    else
        echo "无法找到合适的终端模拟器，请手动启动客户端。"
        echo "命令: cd \"$PWD/$CLIENT_DIR\" && npm install && npm start"
    fi
else
    echo "未知的操作系统，请手动启动客户端。"
    echo "命令: cd \"$PWD/$CLIENT_DIR\" && npm install && npm start"
fi

echo ""
echo "MCP PDF分析系统正在启动..."
echo "服务器地址: http://localhost:$SERVER_PORT"
echo "客户端地址: http://localhost:$CLIENT_PORT"
echo ""
echo "请在浏览器中访问客户端地址: http://localhost:$CLIENT_PORT"
echo "两个终端窗口都必须保持打开状态，关闭窗口将终止相应的服务"
echo ""

# 保持脚本运行
read -p "按回车键退出..." key 