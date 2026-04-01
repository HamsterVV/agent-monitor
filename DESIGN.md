# 技术设计文档 - 详细版

## 1. 消息 @ 解析逻辑

### 1.1 前端实时解析

**文件**: `client/src/utils/mention-parser.js`

```javascript
/**
 * 解析消息内容中的 @ 提到
 * @param {string} text - 输入文本
 * @param {Array} botList - 机器人列表 [{ id, name, is_active }]
 * @returns {Array} mentions - 被@的 bot id 数组 ['1', '2']
 */
export function parseMentions(text, botList) {
  if (!text) return [];
  
  const mentions = new Set(); // 使用 Set 去重
  const mentionRegex = /@([^\s,，.。!！?？:：]+)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const inputName = match[1];
    
    // 精确匹配或前缀匹配
    const matchedBot = botList.find(bot => 
      bot.is_active && (
        bot.name === inputName || 
        bot.name.startsWith(inputName) ||
        inputName.startsWith(bot.name)
      )
    );
    
    if (matchedBot) {
      mentions.add(String(matchedBot.id));
    }
  }
  
  return Array.from(mentions);
}

/**
 * 高亮显示消息中的 @ 提到
 * @param {string} content - 消息内容
 * @param {Array} botList - 机器人列表
 * @returns {string} HTML 字符串
 */
export function highlightMentions(content, botList) {
  if (!content) return '';
  
  let highlighted = escapeHtml(content); // 先转义 HTML 防止 XSS
  
  botList.forEach(bot => {
    const regex = new RegExp(`@${escapeRegExp(bot.name)}`, 'g');
    highlighted = highlighted.replace(
      regex,
      `<span class="mention" data-bot-id="${bot.id}">@${bot.name}</span>`
    );
  });
  
  return highlighted;
}

// 工具函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### 1.2 输入框 @ 提示

**文件**: `client/src/components/MessageInput.vue`

```vue
<template>
  <div class="message-input">
    <textarea
      v-model="inputText"
      @input="handleInput"
      @keydown="handleKeydown"
      placeholder="输入消息，@ 机器人..."
    />
    
    <!-- @ 自动完成提示 -->
    <div v-if="showMentionDropdown" class="mention-dropdown">
      <div
        v-for="(bot, index) in filteredBots"
        :key="bot.id"
        :class="['bot-item', { selected: index === selectedIndex }]"
        @click="selectBot(bot)"
      >
        <span class="avatar">{{ bot.avatar }}</span>
        <span class="name">{{ bot.name }}</span>
      </div>
    </div>
    
    <!-- 图片预览 -->
    <div v-if="selectedImage" class="image-preview">
      <img :src="imagePreviewUrl" />
      <button @click="clearImage">×</button>
    </div>
    
    <!-- 图片上传按钮 -->
    <input
      type="file"
      accept="image/*"
      ref="fileInput"
      @change="handleImageSelect"
      style="display: none"
    />
    <button @click="$refs.fileInput.click()">📷 图片</button>
    
    <button @click="sendMessage" :disabled="!canSend">发送</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { parseMentions } from '@/utils/mention-parser';
import { useBotsStore } from '@/stores/bots';

const botsStore = useBotsStore();
const inputText = ref('');
const selectedImage = ref(null);
const imagePreviewUrl = ref('');
const showMentionDropdown = ref(false);
const mentionQuery = ref('');
const selectedIndex = ref(0);

const filteredBots = computed(() => {
  if (!mentionQuery.value) return botsStore.activeBots;
  return botsStore.activeBots.filter(bot =>
    bot.name.toLowerCase().includes(mentionQuery.value.toLowerCase())
  );
});

const canSend = computed(() => {
  return inputText.value.trim() || selectedImage.value;
});

function handleInput() {
  // 检测 @ 输入
  const atMatch = inputText.value.match(/@([^\s,，.。!！?？:：]+)$/);
  if (atMatch) {
    mentionQuery.value = atMatch[1];
    showMentionDropdown.value = true;
    selectedIndex.value = 0;
  } else {
    showMentionDropdown.value = false;
  }
}

function selectBot(bot) {
  // 替换 @ 部分为完整机器人名称
  const beforeAt = inputText.value.replace(/@[^\s,，.。!！?？:：]+$/, '');
  inputText.value = `${beforeAt}@${bot.name} `;
  showMentionDropdown.value = false;
}

async function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 验证文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB');
    return;
  }
  
  // 创建预览
  imagePreviewUrl.value = URL.createObjectURL(file);
  selectedImage.value = file;
}

function clearImage() {
  selectedImage.value = null;
  imagePreviewUrl.value = '';
}

async function sendMessage() {
  if (!canSend.value) return;
  
  const mentions = parseMentions(inputText.value, botsStore.bots);
  
  let imageUrl = null;
  if (selectedImage.value) {
    // 上传图片
    const formData = new FormData();
    formData.append('image', selectedImage.value);
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    imageUrl = data.url;
  }
  
  // 通过 Socket 发送
  socket.emit('send_message', {
    content: inputText.value.trim(),
    image_url: imageUrl,
    mentions: mentions
  });
  
  // 清空输入
  inputText.value = '';
  clearImage();
}
</script>

<style scoped>
.mention-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-height: 200px;
  overflow-y: auto;
}

.bot-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
}

.bot-item:hover, .bot-item.selected {
  background: #f0f0f0;
}

.bot-item .avatar {
  margin-right: 8px;
}

.image-preview {
  position: relative;
  display: inline-block;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
}

.image-preview button {
  position: absolute;
  top: -8px;
  right: -8px;
  background: red;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
}
</style>
```

### 1.3 后端 @ 解析校验

**文件**: `server/message-parser.js`

```javascript
/**
 * 服务端解析 @ 提到（二次校验）
 * @param {string} content - 消息内容
 * @param {Array} botList - 机器人列表 [{ id, name, is_active }]
 * @returns {Array} mentions - bot id 数组
 */
export function parseMentionsServer(content, botList) {
  if (!content) return [];
  
  const mentions = [];
  
  botList.forEach(bot => {
    if (bot.is_active && content.includes(`@${bot.name}`)) {
      mentions.push(String(bot.id));
    }
  });
  
  return mentions;
}

/**
 * 从 Agent 回复中提取 @ 提到
 * @param {string} content - Agent 回复内容
 * @param {Array} botList - 机器人列表
 * @returns {Array} mentions
 */
export function extractAgentMentions(content, botList) {
  return parseMentionsServer(content, botList);
}
```

---

## 2. Agent 触发与调用

### 2.1 Agent 管理器

**文件**: `server/agent-manager.js`

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * 调用 OpenClaw agents_list API 获取可用 agent 列表
 */
export async function getAvailableAgents() {
  try {
    // 调用 OpenClaw CLI 或直接调用 API
    const { stdout } = await execAsync('openclaw agents_list', {
      cwd: process.env.OPENCLAW_WORKSPACE || '/home/openclaw/.openclaw/workspace'
    });
    
    const agents = JSON.parse(stdout);
    return agents.map(agent => ({
      id: agent.id,
      name: agent.name || agent.id,
      description: agent.description || ''
    }));
  } catch (error) {
    console.error('获取 agent 列表失败:', error);
    throw new Error('无法获取可用 agent 列表');
  }
}

/**
 * 触发 Agent 回复
 * @param {Object} bot - 机器人信息
 * @param {Object} contextMessage - 触发消息
 * @param {number} depth - 递归深度
 * @returns {Promise<string>} Agent 回复内容
 */
export async function triggerAgent(bot, contextMessage, depth = 0) {
  console.log(`触发 Agent: ${bot.name}, depth: ${depth}`);
  
  // 1. 获取聊天历史（最近 20 条）
  const history = await getRecentMessages(20);
  
  // 2. 获取活跃机器人列表（用于@提示）
  const activeBots = await getActiveBots();
  
  // 3. 构建 prompt
  const prompt = buildAgentPrompt(bot, history, contextMessage, activeBots);
  
  // 4. 调用 OpenClaw sessions_spawn
  try {
    const result = await callSessionsSpawn(bot.agent_id, prompt);
    return result.output;
  } catch (error) {
    console.error(`Agent ${bot.name} 调用失败:`, error);
    throw error;
  }
}

/**
 * 构建 Agent Prompt
 */
function buildAgentPrompt(bot, history, currentMessage, activeBots) {
  const historyText = history.map(m => {
    const senderName = m.sender_type === 'user' ? '祥子' : getBotName(m.sender_id);
    return `[${senderName}]: ${m.content}`;
  }).join('\n');
  
  const botListText = activeBots.map(b => `- @${b.name}`).join('\n');
  
  return `你是一个聊天室机器人，名字叫"${bot.name}"。

## 你的身份
${bot.description || 'AI 助手'}

## 聊天历史（最近 20 条）
${historyText}

## 当前消息
[祥子]: ${currentMessage.content}

## 回复规则
1. 只回复被@的消息
2. 可以@其他机器人一起讨论（格式：@机器人名）
3. 回复简洁自然，不要过长（建议 100 字以内）
4. 使用口语化表达，不要机械
5. 如果有图片，可以描述图片内容

## 可用机器人列表
${botListText}

请回复：`;
}

/**
 * 调用 OpenClaw sessions_spawn
 */
async function callSessionsSpawn(agentId, task) {
  // 通过 OpenClaw CLI 或直接 API 调用
  // 这里需要根据实际 OpenClaw API 调整
  const script = `
    const { sessions_spawn } = require('openclaw');
    sessions_spawn({
      runtime: "subagent",
      agentId: "${agentId}",
      task: \`${task.replace(/`/g, '\\`')}\`,
      mode: "run",
      runTimeoutSeconds: 60
    }).then(result => {
      console.log(JSON.stringify(result));
    }).catch(err => {
      console.error(JSON.stringify({ error: err.message }));
    });
  `;
  
  const { stdout, stderr } = await execAsync(`node -e "${script.replace(/"/g, '\\"')}"`, {
    cwd: process.env.OPENCLAW_WORKSPACE
  });
  
  if (stderr) {
    throw new Error(stderr);
  }
  
  return JSON.parse(stdout);
}

/**
 * 处理 Agent 回复（递归触发）
 */
export async function handleAgentReply(botId, content, depth = 0) {
  const MAX_CHAIN_DEPTH = 5;
  
  if (depth > MAX_CHAIN_DEPTH) {
    console.log('达到最大回复深度，停止触发');
    return;
  }
  
  // 1. 保存回复到数据库
  const bot = await getBotById(botId);
  const messageId = await saveMessage({
    sender_type: 'bot',
    sender_id: String(botId),
    sender_name: bot.name,
    content: content,
    is_agent_response: true
  });
  
  // 2. 广播给所有客户端
  const message = await getMessageById(messageId);
  io.emit('new_message', message);
  
  // 3. 解析回复中的 @
  const botList = await getAllBots();
  const mentions = extractAgentMentions(content, botList);
  
  // 4. 触发被@的其他 bot
  for (const mentionedBotId of mentions) {
    if (mentionedBotId !== String(botId)) {
      const mentionedBot = await getBotById(mentionedBotId);
      if (mentionedBot && mentionedBot.is_active) {
        // 延迟触发，避免并发问题
        setTimeout(async () => {
          try {
            const reply = await triggerAgent(mentionedBot, { content }, depth + 1);
            await handleAgentReply(mentionedBotId, reply, depth + 1);
          } catch (error) {
            console.error(`递归触发失败:`, error);
          }
        }, 500);
      }
    }
  }
}
```

---

## 3. Socket.io 事件设计

### 3.1 服务端事件处理

**文件**: `server/socket-handlers.js`

```javascript
import { parseMentionsServer } from './message-parser.js';
import { triggerAgent, handleAgentReply } from './agent-manager.js';
import { saveMessage, getRecentMessages, getMessageById } from './db.js';

export function setupSocketHandlers(io, db) {
  io.on('connection', (socket) => {
    console.log('客户端连接:', socket.id);
    
    // 获取历史消息
    socket.on('get_history', async ({ limit = 30 }, callback) => {
      try {
        const messages = await getRecentMessages(limit);
        callback({ success: true, messages });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // 发送消息
    socket.on('send_message', async (data, callback) => {
      try {
        const { content, image_url, mentions } = data;
        
        // 服务端二次解析 @
        const botList = await getAllBots();
        const validatedMentions = parseMentionsServer(content, botList);
        
        // 保存消息
        const messageId = await saveMessage({
          sender_type: 'user',
          sender_id: 'user',
          sender_name: '祥子',
          content: content || '',
          image_url: image_url || null,
          mentions: validatedMentions
        });
        
        // 获取完整消息对象
        const message = await getMessageById(messageId);
        
        // 广播给所有客户端
        io.emit('new_message', message);
        
        // 触发被@的 bot
        for (const botId of validatedMentions) {
          const bot = await getBotById(botId);
          if (bot && bot.is_active) {
            socket.emit('agent_response', {
              bot_id: botId,
              bot_name: bot.name,
              status: 'thinking'
            });
            
            try {
              const reply = await triggerAgent(bot, { content, image_url });
              await handleAgentReply(botId, reply);
              
              socket.emit('agent_response', {
                bot_id: botId,
                status: 'responded'
              });
            } catch (error) {
              socket.emit('agent_response', {
                bot_id: botId,
                status: 'error',
                error: error.message
              });
            }
          }
        }
        
        callback({ success: true, message_id: messageId });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // 获取机器人列表
    socket.on('get_bot_list', async (callback) => {
      try {
        const bots = await getAllBots();
        callback({ success: true, bots });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // 获取可用 agent 列表
    socket.on('get_agent_list', async (callback) => {
      try {
        const agents = await getAvailableAgents();
        callback({ success: true, agents });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // 断开连接
    socket.on('disconnect', () => {
      console.log('客户端断开:', socket.id);
    });
  });
}
```

### 3.2 客户端 Socket 封装

**文件**: `client/src/api/socket.js`

```javascript
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

export function initSocket(handlers) {
  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => {
    console.log('Socket 已连接');
    handlers.onConnect?.();
  });
  
  socket.on('disconnect', () => {
    console.log('Socket 已断开');
    handlers.onDisconnect?.();
  });
  
  socket.on('new_message', (message) => {
    handlers.onNewMessage?.(message);
  });
  
  socket.on('agent_response', (data) => {
    handlers.onAgentResponse?.(data);
  });
  
  return socket;
}

export function getSocket() {
  return socket;
}

export function sendMessage(content, image_url, mentions) {
  return new Promise((resolve, reject) => {
    socket.emit('send_message', {
      content,
      image_url,
      mentions
    }, (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

export function getHistory(limit = 30) {
  return new Promise((resolve, reject) => {
    socket.emit('get_history', { limit }, (response) => {
      if (response.success) {
        resolve(response.messages);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}
```

---

## 4. 数据库操作

### 4.1 数据库初始化

**文件**: `server/db.js`

```javascript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/agent-monitor.db');

// 确保数据目录存在
import { mkdirSync, existsSync } from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// 初始化表
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      agent_id TEXT NOT NULL,
      avatar TEXT DEFAULT '🤖',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'bot')),
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      mentions TEXT,
      reply_to INTEGER,
      is_agent_response INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      session_key TEXT,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    )
  `);
  
  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(is_active)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_content ON messages(content)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_bot ON agent_sessions(bot_id)`);
  
  console.log('数据库初始化完成');
}

export { db };
```

### 4.2 机器人操作

```javascript
// 获取所有机器人
export function getAllBots() {
  const stmt = db.prepare('SELECT * FROM bots ORDER BY created_at DESC');
  return stmt.all();
}

// 获取活跃机器人
export function getActiveBots() {
  const stmt = db.prepare('SELECT * FROM bots WHERE is_active = 1 ORDER BY name');
  return stmt.all();
}

// 根据 ID 获取机器人
export function getBotById(id) {
  const stmt = db.prepare('SELECT * FROM bots WHERE id = ?');
  return stmt.get(id);
}

// 创建机器人
export function createBot({ name, agent_id, avatar, description }) {
  const stmt = db.prepare(`
    INSERT INTO bots (name, agent_id, avatar, description)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, agent_id, avatar || '🤖', description || null);
  return getBotById(result.lastInsertRowid);
}

// 更新机器人
export function updateBot(id, { name, agent_id, avatar, description, is_active }) {
  const fields = [];
  const values = [];
  
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (agent_id !== undefined) { fields.push('agent_id = ?'); values.push(agent_id); }
  if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE bots SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return getBotById(id);
}

// 删除机器人
export function deleteBot(id) {
  const stmt = db.prepare('DELETE FROM bots WHERE id = ?');
  return stmt.run(id);
}
```

### 4.3 消息操作

```javascript
// 获取最近消息
export function getRecentMessages(limit = 30) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(limit).reverse();
}

// 根据 ID 获取消息
export function getMessageById(id) {
  const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  const message = stmt.get(id);
  if (message && message.mentions) {
    message.mentions = JSON.parse(message.mentions);
  }
  return message;
}

// 保存消息
export function saveMessage({ sender_type, sender_id, sender_name, content, image_url, mentions, reply_to, is_agent_response }) {
  const stmt = db.prepare(`
    INSERT INTO messages (sender_type, sender_id, sender_name, content, image_url, mentions, reply_to, is_agent_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    sender_type,
    sender_id,
    sender_name,
    content,
    image_url || null,
    JSON.stringify(mentions || []),
    reply_to || null,
    is_agent_response || 0
  );
  return result.lastInsertRowid;
}

// 搜索消息
export function searchMessages(query, { sender, limit = 50 } = {}) {
  let sql = `SELECT * FROM messages WHERE content LIKE ?`;
  const params = [`%${query}%`];
  
  if (sender) {
    sql += ` AND sender_type = ?`;
    params.push(sender);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

// 加载更多历史消息
export function getMessagesBefore(beforeId, limit = 30) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE id < ?
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(beforeId, limit).reverse();
}
```

---

## 5. 图片上传

### 5.1 后端上传处理

**文件**: `server/routes/upload.js`

```javascript
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// 确保上传目录存在
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只支持图片文件'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

const router = express.Router();

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// 错误处理
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制 (5MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message });
});

export default router;
```

### 5.2 静态文件服务

**文件**: `server/index.js`

```javascript
import express from 'express';
import path from 'path';

const app = express();

// 静态文件服务（ uploads 目录）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

---

## 6. 消息搜索

### 6.1 搜索 API

**文件**: `server/routes/messages.js`

```javascript
import express from 'express';
import { searchMessages } from '../db.js';

const router = express.Router();

// 搜索消息
router.get('/search', (req, res) => {
  const { q, sender, limit = 50 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: '缺少搜索关键词 q' });
  }
  
  try {
    const messages = searchMessages(q, { sender, limit: parseInt(limit) });
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 6.2 前端搜索组件

**文件**: `client/src/components/SearchBar.vue`

```vue
<template>
  <div class="search-bar">
    <input
      v-model="query"
      @input="debouncedSearch"
      placeholder="搜索消息..."
    />
    
    <select v-model="senderFilter">
      <option value="">全部</option>
      <option value="user">祥子</option>
      <option value="bot">机器人</option>
    </select>
    
    <div v-if="results.length" class="search-results">
      <div v-for="msg in results" :key="msg.id" class="result-item">
        <span class="sender" :class="msg.sender_type">{{ msg.sender_name }}</span>
        <span class="time">{{ formatTime(msg.created_at) }}</span>
        <p class="content" v-html="highlightKeyword(msg.content, query)"></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { debounce } from 'lodash-es';

const query = ref('');
const senderFilter = ref('');
const results = ref([]);

const search = debounce(async () => {
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  
  const params = new URLSearchParams({
    q: query.value,
    sender: senderFilter.value,
    limit: 50
  });
  
  const res = await fetch(`/api/messages/search?${params}`);
  const data = await res.json();
  results.value = data.messages;
}, 300);

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function highlightKeyword(content, keyword) {
  if (!keyword) return content;
  const regex = new RegExp(`(${keyword})`, 'gi');
  return content.replace(regex, '<mark>$1</mark>');
}
</script>

<style scoped>
.search-bar {
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
}

.result-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item .sender {
  font-weight: 500;
  margin-right: 8px;
}

.result-item .sender.user {
  color: #1890ff;
}

.result-item .sender.bot {
  color: #52c41a;
}

.result-item .time {
  color: #999;
  font-size: 12px;
}

.result-item .content {
  margin-top: 4px;
  color: #333;
}

.result-item mark {
  background: #ffeb3b;
  padding: 2px 4px;
  border-radius: 2px;
}
</style>
```

---

## 7. 错误处理

### 7.1 Agent 调用超时

```javascript
async function callSessionsSpawn(agentId, task) {
  const timeout = 60000; // 60 秒
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const result = await executeSpawn(agentId, task, { signal: controller.signal });
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Agent 响应超时 (60 秒)');
    }
    throw error;
  }
}
```

### 7.2 全局错误处理

**文件**: `server/index.js`

```javascript
// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || '服务器内部错误',
      status: err.status || 500
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});
```

---

## 8. 前端状态管理

### 8.1 聊天状态 Store

**文件**: `client/src/stores/chat.js`

```javascript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const isLoading = ref(false);
  const agentStatus = ref({}); // { botId: 'thinking' | 'responded' | 'error' }
  
  function addMessage(message) {
    messages.value.push(message);
  }
  
  function setMessages(newMessages) {
    messages.value = newMessages;
  }
  
  function setAgentStatus(botId, status) {
    agentStatus.value[botId] = status;
  }
  
  function clearAgentStatus(botId) {
    delete agentStatus.value[botId];
  }
  
  return {
    messages,
    isLoading,
    agentStatus,
    addMessage,
    setMessages,
    setAgentStatus,
    clearAgentStatus
  };
});
```

### 8.2 机器人状态 Store

**文件**: `client/src/stores/bots.js`

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useBotsStore = defineStore('bots', () => {
  const bots = ref([]);
  
  const activeBots = computed(() => {
    return bots.value.filter(bot => bot.is_active);
  });
  
  function setBots(newBots) {
    bots.value = newBots;
  }
  
  function addBot(bot) {
    bots.value.push(bot);
  }
  
  function updateBot(updatedBot) {
    const index = bots.value.findIndex(b => b.id === updatedBot.id);
    if (index !== -1) {
      bots.value[index] = updatedBot;
    }
  }
  
  function removeBot(id) {
    bots.value = bots.value.filter(b => b.id !== id);
  }
  
  return {
    bots,
    activeBots,
    setBots,
    addBot,
    updateBot,
    removeBot
  };
});
```

---

**最后更新**: 2026-04-01
