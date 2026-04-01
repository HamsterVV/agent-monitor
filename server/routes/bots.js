import express from 'express';
import { getAllBots, getBotById, createBot, updateBot, deleteBot } from '../db.js';

const router = express.Router();

// 获取所有机器人
router.get('/', (req, res) => {
  try {
    const bots = getAllBots();
    res.json({ success: true, bots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个机器人
router.get('/:id', (req, res) => {
  try {
    const bot = getBotById(req.params.id);
    if (!bot) {
      return res.status(404).json({ success: false, error: '机器人不存在' });
    }
    res.json({ success: true, bot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建机器人
router.post('/', (req, res) => {
  try {
    const { name, agent_id, avatar, description } = req.body;
    
    if (!name || !agent_id) {
      return res.status(400).json({ success: false, error: 'name 和 agent_id 是必填项' });
    }
    
    const bot = createBot({ name, agent_id, avatar, description });
    res.status(201).json({ success: true, bot });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: '机器人名称已存在' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新机器人
router.put('/:id', (req, res) => {
  try {
    const { name, agent_id, avatar, description, is_active } = req.body;
    const bot = updateBot(req.params.id, { name, agent_id, avatar, description, is_active });
    res.json({ success: true, bot });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: '机器人名称已存在' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除机器人
router.delete('/:id', (req, res) => {
  try {
    deleteBot(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 切换机器人状态
router.patch('/:id/toggle', (req, res) => {
  try {
    const bot = getBotById(req.params.id);
    if (!bot) {
      return res.status(404).json({ success: false, error: '机器人不存在' });
    }
    
    const updatedBot = updateBot(req.params.id, { is_active: bot.is_active ? 0 : 1 });
    res.json({ success: true, bot: updatedBot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
