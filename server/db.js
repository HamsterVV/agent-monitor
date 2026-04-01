import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/agent-monitor.db');

// 确保数据目录存在
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

// 机器人操作
export function getAllBots() {
  const stmt = db.prepare('SELECT * FROM bots ORDER BY created_at DESC');
  return stmt.all();
}

export function getActiveBots() {
  const stmt = db.prepare('SELECT * FROM bots WHERE is_active = 1 ORDER BY name');
  return stmt.all();
}

export function getBotById(id) {
  const stmt = db.prepare('SELECT * FROM bots WHERE id = ?');
  return stmt.get(id);
}

export function createBot({ name, agent_id, avatar, description }) {
  const stmt = db.prepare(`
    INSERT INTO bots (name, agent_id, avatar, description)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, agent_id, avatar || '🤖', description || null);
  return getBotById(result.lastInsertRowid);
}

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

export function deleteBot(id) {
  const stmt = db.prepare('DELETE FROM bots WHERE id = ?');
  return stmt.run(id);
}

// 消息操作
export function getRecentMessages(limit = 30) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  const messages = stmt.all(limit);
  return messages.map(m => {
    if (m.mentions) {
      try {
        m.mentions = JSON.parse(m.mentions);
      } catch (e) {
        m.mentions = [];
      }
    }
    return m;
  }).reverse();
}

export function getMessageById(id) {
  const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  const message = stmt.get(id);
  if (message && message.mentions) {
    try {
      message.mentions = JSON.parse(message.mentions);
    } catch (e) {
      message.mentions = [];
    }
  }
  return message;
}

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
  const messages = stmt.all(...params);
  return messages.map(m => {
    if (m.mentions) {
      try {
        m.mentions = JSON.parse(m.mentions);
      } catch (e) {
        m.mentions = [];
      }
    }
    return m;
  });
}

export function getMessagesBefore(beforeId, limit = 30) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE id < ?
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  const messages = stmt.all(beforeId, limit);
  return messages.map(m => {
    if (m.mentions) {
      try {
        m.mentions = JSON.parse(m.mentions);
      } catch (e) {
        m.mentions = [];
      }
    }
    return m;
  }).reverse();
}
