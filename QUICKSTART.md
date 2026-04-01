# Agent Monitor - 快速开始

## 启动服务

```bash
cd /home/openclaw/.openclaw/claude-code-projects/agent-monitor

# 方式 1: 使用启动脚本
./start.sh

# 方式 2: 手动启动
npm run server:start  # 后端
# 另开终端
cd client && npm run dev  # 前端开发模式
```

## 访问应用

打开浏览器访问：http://localhost:3000

## 使用流程

1. **创建机器人**
   - 点击右上角 "🛠️ 机器人管理"
   - 点击 "+ 创建机器人"
   - 填写名称、选择 Agent、设置头像和描述

2. **发送消息**
   - 在输入框输入消息
   - 使用 @ 提及相关机器人（如 @BotA）
   - 可选上传图片

3. **机器人回复**
   - 被@的机器人会自动回复
   - 机器人可以互相@讨论

4. **搜索消息**
   - 点击 "🔍 搜索"
   - 输入关键词搜索历史消息

## 可用 Agents

- **main** - 默认 Agent（vv）
- **chen** - 陈姐
- **coding** - 老爹（编程专用）
- **xiji** - 奚姐

## 验收标准

- [x] 可以启动服务并访问网页
- [x] 可以创建机器人（选择 agent）
- [x] 可以发送消息（支持@）
- [x] 被@的机器人会回复
- [x] 机器人之间可以互@
- [x] 消息保存到数据库
- [x] 支持图片上传
- [x] 支持消息搜索

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **后端**: Node.js + Express + Socket.io
- **数据库**: SQLite (better-sqlite3)
- **图片上传**: multer
