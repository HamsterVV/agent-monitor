import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * 获取机器人名称
 */
export function getBotName(botId) {
  return 'Bot';
}

/**
 * 调用 OpenClaw CLI 获取可用 agent 列表
 */
export async function getAvailableAgents() {
  try {
    const { stdout } = await execAsync('openclaw agents list', {
      cwd: '/home/openclaw/.openclaw/workspace'
    });
    
    console.log('[Agent Manager] Raw output:', stdout);
    
    // 解析输出 - 格式：- id (name) 或 - id
    const agents = [];
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      // 只处理以 "- " 开头的行，跳过 "Agents:" 和缩进行
      if (!line.trim().startsWith('- ')) continue;
      
      // 匹配：- main (default) 或 - coding (老爹) 或 - chen
      const match = line.match(/^- (\S+)(?:\s+\(([^)]+)\))?/);
      if (match) {
        const id = match[1];
        const name = match[2] || id; // 如果没有括号名称，使用 id 作为名称
        agents.push({ id, name });
        console.log(`[Agent Manager] Parsed agent: ${id} -> ${name}`);
      }
    }
    
    console.log('[Agent Manager] Total agents found:', agents.length);
    return agents;
  } catch (error) {
    console.error('[Agent Manager] 获取 agent 列表失败:', error);
    throw new Error('无法获取可用 agent 列表：' + error.message);
  }
}

/**
 * 调用 OpenClaw agent 命令
 */
export async function callAgent(agentId, task) {
  try {
    // 转义 task 中的特殊字符
    const escapedTask = task.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    const { stdout, stderr } = await execAsync(
      `openclaw agent --agent "${agentId}" --message "${escapedTask}" --json`,
      {
        cwd: '/home/openclaw/.openclaw/workspace',
        timeout: 60000
      }
    );
    
    if (stderr) {
      console.error('Agent stderr:', stderr);
    }
    
    const result = JSON.parse(stdout);
    return result;
  } catch (error) {
    console.error('调用 agent 失败:', error);
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (e) {
        // ignore
      }
    }
    throw error;
  }
}

/**
 * 触发 Agent 回复
 */
export async function triggerAgent(bot, contextMessage, depth = 0) {
  console.log(`触发 Agent: ${bot.name}, depth: ${depth}`);
  
  // 1. 获取聊天历史（最近 20 条）
  const { getRecentMessages } = await import('./db.js');
  const history = await getRecentMessages(20);
  
  // 2. 获取活跃机器人列表
  const { getActiveBots } = await import('./db.js');
  const activeBots = await getActiveBots();
  
  // 3. 构建 prompt
  const prompt = buildAgentPrompt(bot, history, contextMessage, activeBots);
  
  // 4. 调用 agent
  const result = await callAgent(bot.agent_id, prompt);
  return result.output || result.message || result.text || '...';
}

/**
 * 构建 Agent Prompt
 */
function buildAgentPrompt(bot, history, currentMessage, activeBots) {
  const historyText = history.map(m => {
    const senderName = m.sender_type === 'user' ? '祥子' : m.sender_name;
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
 * 处理 Agent 回复（递归触发）
 */
export async function handleAgentReply(io, botId, content, depth = 0) {
  const MAX_CHAIN_DEPTH = 5;
  
  if (depth > MAX_CHAIN_DEPTH) {
    console.log('达到最大回复深度，停止触发');
    return;
  }
  
  const { getBotById, saveMessage, getMessageById, getAllBots } = await import('./db.js');
  const { extractAgentMentions } = await import('./message-parser.js');
  
  const bot = await getBotById(botId);
  if (!bot) {
    console.error(`Bot ${botId} 不存在`);
    return;
  }
  
  const messageId = await saveMessage({
    sender_type: 'bot',
    sender_id: String(botId),
    sender_name: bot.name,
    content: content,
    is_agent_response: true
  });
  
  const message = await getMessageById(messageId);
  io.emit('new_message', message);
  
  const botList = await getAllBots();
  const mentions = extractAgentMentions(content, botList);
  
  for (const mentionedBotId of mentions) {
    if (mentionedBotId !== String(botId)) {
      const mentionedBot = await getBotById(mentionedBotId);
      if (mentionedBot && mentionedBot.is_active) {
        setTimeout(async () => {
          try {
            const reply = await triggerAgent(mentionedBot, { content }, depth + 1);
            await handleAgentReply(io, mentionedBotId, reply, depth + 1);
          } catch (error) {
            console.error(`递归触发失败:`, error);
          }
        }, 500);
      }
    }
  }
}
