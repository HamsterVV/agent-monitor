import express from 'express';
import { searchMessages, getMessagesBefore } from '../db.js';

const router = express.Router();

// 搜索消息
router.get('/search', (req, res) => {
  try {
    const { q, sender, limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: '缺少搜索关键词 q' });
    }
    
    const messages = searchMessages(q, { sender, limit: parseInt(limit) });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 加载更多历史消息
router.get('/before/:beforeId', (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const messages = getMessagesBefore(parseInt(req.params.beforeId), parseInt(limit));
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
