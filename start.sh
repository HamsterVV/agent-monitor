#!/bin/bash

# Agent Monitor 启动脚本

echo "🤖 启动 Agent Monitor..."

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "安装后端依赖..."
  npm install
fi

if [ ! -d "client/node_modules" ]; then
  echo "安装前端依赖..."
  cd client && npm install && cd ..
fi

# 构建前端
echo "构建前端..."
cd client && npm run build && cd ..

# 启动服务器
echo "启动服务器..."
node server/index.js
