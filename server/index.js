import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

import { initDatabase } from './db.js';
import { setupSocketHandlers } from './socket-handlers.js';
import botsRouter from './routes/bots.js';
import messagesRouter from './routes/messages.js';
import uploadRouter from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 初始化数据库
initDatabase();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.use(express.static(path.join(__dirname, '../client/dist')));

// API 路由
app.use('/api/bots', botsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/upload', uploadRouter);

// 获取可用 agent 列表（HTTP API）
app.post('/api/agents/list', async (req, res) => {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('openclaw agents list', {
      cwd: '/home/openclaw/.openclaw/workspace'
    });
    
    const agents = [];
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      // 匹配：- main (default)  或  - coding (老爹)
      const match = line.match(/^- (\S+)\s+\(([^)]+)\)/);
      if (match) {
        agents.push({
          id: match[1],
          name: match[2]
        });
      }
    }
    
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket 事件处理
setupSocketHandlers(io);

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || '服务器内部错误',
      status: err.status || 500
    }
  });
});

// 404 处理 - 返回前端页面（SPA）
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
