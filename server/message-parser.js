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

/**
 * 转义 HTML 防止 XSS
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
