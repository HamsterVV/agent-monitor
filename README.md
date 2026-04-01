# Agent Monitor - 多 Agent 网页聊天室

一个本地运行的多 Agent 实时聊天室，支持创建多个机器人（每个机器人对应一个 OpenClaw subagent），支持 @ 功能，多个 Agent 可以互相沟通。

## 🎯 核心功能

| 功能 | 说明 |
|------|------|
| **单房间多机器人** | 所有 Agent 在同一个聊天室内聊天 |
| **@ 触发回复** | 只有被 @ 的 Agent 才会回复消息 |
| **Agent 互@** | Agent 之间可以互相 @ 讨论 |
| **消息持久化** | 聊天记录保存到 SQLite 数据库 |
| **机器人配置持久化** | 机器人名称、绑定的 Agent ID 保存到数据库 |
| **图片支持** | 用户和 Agent 都可以发送图片 |
| **消息搜索** | 支持按关键词搜索历史消息 |
| **本地运行** | 无需外部部署，一键启动 |

## 🛠️ 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | Vue 3 | 3.4+ | 轻量、响应式 |
| 构建工具 | Vite | 5.0+ | 快速开发服务器 |
| UI 框架 | Element Plus | 2.4+ | 简洁组件库 |
| 状态管理 | Pinia | 2.1+ | Vue3 状态管理 |
| 后端 | Node.js | 18+ | 与 OpenClaw 同生态 |
| Web 框架 | Express | 4.18+ | HTTP 服务器 |
| 实时通信 | Socket.io | 4.6+ | WebSocket 双工通信 |
| 数据库 | SQLite | 3.0+ | better-sqlite3 |
| Agent 接入 | OpenClaw CLI | - | sessions_spawn |

## 📁 项目结构

```
agent-monitor/
├── server/                     # 后端代码
│   ├── index.js               # 入口文件（Express + Socket.io）
│   ├── socket-handlers.js     # Socket 事件处理
│   ├── agent-manager.js       # Agent 管理（创建/调用 subagent）
│   ├── message-parser.js      # 消息解析（@ 识别）
│   ├── db.js                  # SQLite 数据库操作
│   └── routes/
│       ├── bots.js            # 机器人管理 API
│       ├── messages.js        # 消息管理 API
│       └── agents.js          # OpenClaw Agent 列表 API
├── client/                     # 前端代码
│   ├── src/
│   │   ├── main.js            # 入口文件
│   │   ├── App.vue            # 根组件
│   │   ├── components/
│   │   │   ├── ChatRoom.vue   # 聊天室主界面
│   │   │   ├── MessageList.vue # 消息列表
│   │   │   ├── MessageItem.vue # 单条消息气泡
│   │   │   ├── MessageInput.vue # 消息输入框（支持图片）
│   │   │   ├── BotPanel.vue   # 机器人管理面板
│   │   │   ├── BotConfig.vue  # 机器人创建/编辑表单
│   │   │   └── SearchBar.vue  # 消息搜索栏
│   │   ├── stores/
│   │   │   ├── chat.js        # 聊天状态（消息列表、发送状态）
│   │   │   └── bots.js        # 机器人状态（列表、配置）
│   │   ├── api/
│   │   │   ├── socket.js      # Socket 连接封装
│   │   │   └── http.js        # HTTP API 封装
│   │   └── utils/
│   │       ├── mention-parser.js # @ 解析工具
│   │       └── image-compressor.js # 图片压缩
│   └── index.html
├── data/                       # 数据目录（自动创建）
│   └── agent-monitor.db       # SQLite 数据库文件
├── uploads/                    # 图片上传目录（自动创建）
├── package.json
├── README.md
└── DESIGN.md
```

## 🗄️ 数据库设计

### 1. bots 表（机器人配置）

```sql
CREATE TABLE bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,        -- 机器人显示名称
  agent_id TEXT NOT NULL,           -- 绑定的 OpenClaw agent ID
  avatar TEXT DEFAULT '🤖',         -- 头像（emoji 或 URL）
  description TEXT,                 -- 机器人描述（可选）
  is_active INTEGER DEFAULT 1,      -- 是否启用：1=启用，0=禁用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_bots_active ON bots(is_active);
```

**字段说明**：
- `name`: 机器人在聊天室显示的名称，如 "BotA"
- `agent_id`: OpenClaw agent ID，通过 `agents_list` API 获取
- `avatar`: 头像，支持 emoji（如 🤖）或 URL
- `description`: 机器人描述，帮助用户了解用途
- `is_active`: 禁用后不再响应 @

### 2. messages 表（消息记录）

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'bot')),
  sender_id TEXT NOT NULL,          -- user 固定为 'user'，bot 为 bots.id
  sender_name TEXT NOT NULL,        -- 发送者名称
  content TEXT NOT NULL,            -- 消息文本内容
  image_url TEXT,                   -- 图片 URL（可选）
  mentions TEXT,                    -- JSON 数组，被@的 bot id 列表，如 '["1","2"]'
  reply_to INTEGER,                 -- 回复的消息 ID（可选）
  is_agent_response INTEGER DEFAULT 0, -- 是否为 Agent 自动回复
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_content ON messages(content); -- 用于搜索
```

**字段说明**：
- `sender_type`: 'user'（用户）或 'bot'（机器人）
- `sender_id`: 用户固定为 'user'，机器人为 bots 表的 id
- `content`: 消息文本，支持纯文本
- `image_url`: 图片相对路径，如 '/uploads/xxx.jpg'
- `mentions`: JSON 字符串，存储被@的 bot id 数组
- `reply_to`: 如果是回复某条消息，存储原消息 id
- `is_agent_response`: 标记是否为 Agent 自动回复（用于样式区分）

### 3. agent_sessions 表（Agent 会话缓存）

```sql
CREATE TABLE agent_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id INTEGER NOT NULL,          -- 关联 bots.id
  session_key TEXT,                 -- OpenClaw session key（可选）
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_sessions_bot ON agent_sessions(bot_id);
```

**说明**：用于缓存 Agent 会话信息，可选功能。

## 📝 功能详细设计

### 1. 机器人管理

#### 1.1 获取可用 Agent 列表

**调用时机**：打开机器人配置面板时

**API**: `GET /api/agents/list`

**后端逻辑**：
```javascript
// 调用 OpenClaw agents_list API
const agents = await fetch('http://localhost:8080/api/agents_list', {
  method: 'POST'
}).then(r => r.json());

// 返回给前端
return agents.map(a => ({
  id: a.id,
  name: a.name || a.id
}));
```

**前端展示**：下拉选择框，显示 agent 列表

#### 1.2 创建机器人

**API**: `POST /api/bots`

**请求体**：
```json
{
  "name": "BotA",
  "agent_id": "agent_xxx",
  "avatar": "🤖",
  "description": "AI 助手"
}
```

**验证规则**：
- `name`: 必填，1-20 字符，不能重复
- `agent_id`: 必填，必须是有效的 agent ID
- `avatar`: 可选，默认 '🤖'
- `description`: 可选

**响应**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "BotA",
    "agent_id": "agent_xxx",
    "avatar": "🤖",
    "created_at": "2026-04-01T09:00:00Z"
  }
}
```

#### 1.3 编辑机器人

**API**: `PUT /api/bots/:id`

**请求体**：同创建，所有字段可选

#### 1.4 删除机器人

**API**: `DELETE /api/bots/:id`

**级联操作**：删除机器人后，其历史消息保留但 sender_id 显示为已删除

#### 1.5 启用/禁用机器人

**API**: `PATCH /api/bots/:id/toggle`

**请求体**：
```json
{
  "is_active": false
}
```

**效果**：禁用后不再响应 @，但历史消息保留

---

### 2. 消息发送与接收

#### 2.1 用户发送消息

**流程**：
```
1. 用户输入内容（可选图片）
2. 前端解析 @ 提到哪些 bot
3. 通过 Socket 发送到后端
4. 后端保存到数据库
5. 广播给所有连接的客户端
6. 触发被@的 bot 对应的 agent
```

**Socket 事件**: `send_message`

**请求体**：
```json
{
  "content": "@BotA 你好，今天天气怎么样？",
  "image_url": "/uploads/xxx.jpg",  // 可选
  "mentions": ["1", "2"]            // 被@的 bot id 数组
}
```

**响应**：后端自动广播 `new_message` 事件

#### 2.2 消息格式

**消息对象**：
```json
{
  "id": 123,
  "sender_type": "user",
  "sender_id": "user",
  "sender_name": "祥子",
  "content": "@BotA 你好",
  "image_url": null,
  "mentions": ["1"],
  "reply_to": null,
  "is_agent_response": false,
  "created_at": "2026-04-01T09:00:00Z"
}
```

#### 2.3 历史消息加载

**首次加载**: 30 条最新消息

**API**: `GET /api/messages?limit=30`

**加载更多**: 滚动到顶部时加载更早的 30 条

**分页参数**:
```
GET /api/messages?limit=30&before=123  // 加载 id < 123 的消息
```

---

### 3. @ 功能详解

#### 3.1 前端 @ 解析

**输入时实时解析**：
```javascript
// 监听输入框内容变化
function parseMentions(text, botList) {
  const mentions = [];
  const mentionRegex = /@(\S+)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const botName = match[1];
    // 模糊匹配 bot 名称
    const bot = botList.find(b => 
      b.name === botName || b.name.startsWith(botName)
    );
    if (bot && bot.is_active) {
      mentions.push({
        id: String(bot.id),
        name: bot.name,
        offset: match.index
      });
    }
  }
  
  return mentions;
}
```

**@ 高亮显示**：
```vue
<template>
  <span v-html="highlightedContent"></span>
</template>

<script>
computed: {
  highlightedContent() {
    let content = this.message.content;
    this.message.mentions.forEach(mentionId => {
      const bot = this.bots.find(b => String(b.id) === mentionId);
      if (bot) {
        content = content.replace(
          `@${bot.name}`,
          `<span class="mention">@${bot.name}</span>`
        );
      }
    });
    return content;
  }
}
</script>

<style>
.mention {
  color: #1890ff;
  font-weight: 500;
  background: rgba(24, 144, 255, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
```

#### 3.2 后端 @ 触发逻辑

**触发条件**：
```javascript
// 只有被@的 bot 才触发 agent
if (message.mentions && message.mentions.length > 0) {
  for (const botId of message.mentions) {
    const bot = await getBotById(botId);
    if (bot && bot.is_active) {
      await triggerAgent(bot, message);
    }
  }
}
```

**不触发的情况**：
- bot 被禁用（is_active = 0）
- bot 不存在
- 消息中没有@该 bot

---

### 4. Agent 调用与回复

#### 4.1 调用 OpenClaw sessions_spawn

**agent-manager.js**：
```javascript
async function triggerAgent(bot, contextMessage) {
  // 1. 获取聊天历史（最近 20 条）
  const history = await getRecentMessages(20);
  
  // 2. 构建 prompt
  const prompt = buildAgentPrompt(bot, history, contextMessage);
  
  // 3. 调用 OpenClaw API
  const result = await sessions_spawn({
    runtime: "subagent",
    agentId: bot.agent_id,
    task: prompt,
    mode: "run",
    runTimeoutSeconds: 60
  });
  
  // 4. 获取回复
  return result.output;
}
```

#### 4.2 Agent Prompt 模板

```javascript
function buildAgentPrompt(bot, history, currentMessage) {
  return `你是一个聊天室机器人，名字叫"${bot.name}"。

## 你的身份
${bot.description || 'AI 助手'}

## 聊天历史（最近 20 条）
${history.map(m => `[${m.sender_type === 'user' ? '祥子' : getBotName(m.sender_id)}]: ${m.content}`).join('\n')}

## 当前消息
[${currentMessage.sender_name}]: ${currentMessage.content}

## 回复规则
1. 只回复被@的消息
2. 可以@其他机器人一起讨论（格式：@机器人名）
3. 回复简洁自然，不要过长（建议 100 字以内）
4. 使用口语化表达，不要机械
5. 如果有图片，可以描述图片内容

## 可用机器人列表
${getActiveBots().map(b => `- @${b.name}`).join('\n')}

请回复：`;
}
```

#### 4.3 Agent 回复处理

**流程**：
```
1. 接收 Agent 回复
2. 保存到数据库（sender_type='bot', sender_id=bot.id）
3. 广播 new_message 事件
4. 解析回复中的 @
5. 触发被@的其他 bot（递归）
```

**递归控制**：
```javascript
const MAX_CHAIN_DEPTH = 5;

async function handleAgentReply(botId, content, depth = 0) {
  if (depth > MAX_CHAIN_DEPTH) {
    console.log('达到最大回复深度，停止触发');
    return;
  }
  
  // 保存回复
  const messageId = await saveMessage({
    sender_type: 'bot',
    sender_id: String(botId),
    sender_name: getBotName(botId),
    content: content,
    is_agent_response: true
  });
  
  // 广播
  io.emit('new_message', message);
  
  // 解析回复中的 @
  const mentions = parseMentionsServer(content, botList);
  
  // 触发被@的其他 bot
  for (const mentionedBotId of mentions) {
    if (mentionedBotId !== String(botId)) {
      const mentionedBot = await getBotById(mentionedBotId);
      if (mentionedBot && mentionedBot.is_active) {
        await triggerAgent(mentionedBot, { content, depth: depth + 1 });
      }
    }
  }
}
```

---

### 5. 图片支持

#### 5.1 图片上传

**前端**：
```vue
<input type="file" accept="image/*" @change="handleImageSelect" />

<script>
async function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 压缩图片（可选）
  const compressed = await compressImage(file, { maxWidth: 1920 });
  
  // 上传到后端
  const formData = new FormData();
  formData.append('image', compressed);
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData
  });
  
  const { url } = await response.json();
  // url = '/uploads/xxx.jpg'
}
</script>
```

**后端**：
```javascript
// routes/upload.js
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

app.post('/api/upload/image', upload.single('image'), (req, res) => {
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});
```

#### 5.2 图片显示

**消息组件**：
```vue
<template>
  <div class="message">
    <div class="content">{{ message.content }}</div>
    <img v-if="message.image_url" :src="message.image_url" class="message-image" />
  </div>
</template>

<style>
.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  margin-top: 8px;
  cursor: pointer;
}
</style>
```

---

### 6. 消息搜索

#### 6.1 搜索界面

**位置**：聊天室顶部搜索栏

**功能**：
- 输入关键词实时搜索
- 支持按发送者过滤（祥子/机器人）
- 显示搜索结果列表

#### 6.2 搜索 API

**API**: `GET /api/messages/search?q=关键词&sender=user|bot`

**后端实现**：
```javascript
app.get('/api/messages/search', (req, res) => {
  const { q, sender, limit = 50 } = req.query;
  
  let sql = `
    SELECT * FROM messages 
    WHERE content LIKE ?
  `;
  const params = [`%${q}%`];
  
  if (sender) {
    sql += ` AND sender_type = ?`;
    params.push(sender);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const messages = db.prepare(sql).all(...params);
  res.json({ messages });
});
```

#### 6.3 搜索结果显示

**前端**：
```vue
<template>
  <div class="search-results">
    <div v-for="msg in results" :key="msg.id" class="result-item">
      <span class="sender">{{ msg.sender_name }}</span>
      <span class="time">{{ formatTime(msg.created_at) }}</span>
      <p class="content" v-html="highlightKeyword(msg.content, keyword)"></p>
    </div>
  </div>
</template>
```

---

### 7. 用户身份

**固定配置**：
- 用户名：`祥子`
- 用户 ID: `user`
- 头像：👤（固定）

**无需登录系统**，打开即用。

---

## 🔄 完整流程示例

### 场景：用户@BotA，BotA 回复并@BotB

```
1. 祥子输入：@BotA 你觉得这个方案怎么样？
   
2. 前端解析：mentions = ['1'] (BotA 的 id)

3. Socket 发送：
   { content: '@BotA 你觉得这个方案怎么样？', mentions: ['1'] }

4. 后端处理：
   - 保存到数据库
   - 广播 new_message
   - 检测到 mentions 包含 BotA
   - 调用 BotA 对应的 agent

5. Agent 回复：
   "我觉得不错，@BotB 你觉得呢？"

6. 后端处理回复：
   - 保存到数据库（sender_type='bot', sender_id='1'）
   - 广播 new_message
   - 解析回复中的 @BotB
   - 调用 BotB 对应的 agent

7. BotB 回复：
   "我也同意！"

8. 循环结束（没有更多@）
```

---

## 🚀 启动流程

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（前后端一起）
npm run dev

# 3. 访问 http://localhost:5173
```

## ⚙️ 配置项

| 配置 | 说明 | 默认值 |
|------|------|--------|
| PORT | 后端端口 | 3000 |
| VITE_SOCKET_URL | Socket 连接地址 | http://localhost:3000 |
| DB_PATH | SQLite 数据库路径 | ./data/agent-monitor.db |
| UPLOAD_DIR | 图片上传目录 | ./uploads |
| OPENCLAW_HOST | OpenClaw API 地址 | http://localhost:8080 |

## 📋 开发优先级

### Phase 1 - 基础框架
- [ ] 项目初始化（Vue3 + Express）
- [ ] Socket.io 连接
- [ ] SQLite 数据库初始化
- [ ] 基础聊天界面

### Phase 2 - 核心功能
- [ ] 消息发送/接收
- [ ] 历史消息加载（30 条）
- [ ] 机器人管理（CRUD）
- [ ] @ 解析与高亮

### Phase 3 - Agent 集成
- [ ] agents_list API 调用
- [ ] sessions_spawn 调用
- [ ] Agent 回复处理
- [ ] Agent 互@递归逻辑

### Phase 4 - 增强功能
- [ ] 图片上传/显示
- [ ] 消息搜索
- [ ] 错误处理
- [ ] 性能优化

---

**状态**: 需求确认完成，等待开发  
**最后更新**: 2026-04-01
