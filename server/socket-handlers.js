import { parseMentionsServer } from './message-parser.js';
import { triggerAgent, handleAgentReply, getAvailableAgents } from './agent-manager.js';
import { 
  saveMessage, 
  getRecentMessages, 
  getMessageById, 
  getAllBots, 
  getBotById,
  getActiveBots 
} from './db.js';

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
    
    // 加载更多历史消息
    socket.on('load_more', async ({ beforeId, limit = 30 }, callback) => {
      try {
        const messages = await getMessagesBefore(beforeId, limit);
        callback({ success: true, messages });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // 发送消息
    socket.on('send_message', async (data, callback) => {
      try {
        console.log('[Socket] send_message 收到数据:', data);
        const { content, image_url, mentions } = data;
        
        // 服务端二次解析 @
        const botList = await getAllBots();
        const validatedMentions = parseMentionsServer(content, botList);
        console.log('[Socket] 解析 mentions:', validatedMentions);
        
        // 保存消息
        const messageId = await saveMessage({
          sender_type: 'user',
          sender_id: 'user',
          sender_name: '祥子',
          content: content || '',
          image_url: image_url || null,
          mentions: validatedMentions
        });
        console.log('[Socket] 消息已保存，ID:', messageId);
        
        // 获取完整消息对象
        const message = await getMessageById(messageId);
        console.log('[Socket] 获取到的消息对象:', message);
        
        // 广播给所有客户端
        console.log('[Socket] 广播 new_message 事件');
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
              await handleAgentReply(io, botId, reply);
              
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
        console.log('[Socket] send_message 完成');
      } catch (error) {
        console.error('[Socket] send_message 错误:', error);
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
        console.log('[Socket] get_agent_list 请求收到');
        const agents = await getAvailableAgents();
        console.log('[Socket] get_agent_list 返回:', agents);
        callback({ success: true, agents });
      } catch (error) {
        console.error('[Socket] get_agent_list 错误:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    // 断开连接
    socket.on('disconnect', () => {
      console.log('客户端断开:', socket.id);
    });
  });
}
