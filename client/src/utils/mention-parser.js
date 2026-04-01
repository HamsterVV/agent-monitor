/**
 * 解析消息内容中的 @ 提到
 * @param {string} text - 输入文本
 * @param {Array} botList - 机器人列表 [{ id, name, is_active }]
 * @returns {Array} mentions - 被@的 bot id 数组 ['1', '2']
 */
export function parseMentions(text, botList) {
  if (!text) return [];
  
  const mentions = new Set();
  const mentionRegex = /@([^\s,，.。!！?？:：]+)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const inputName = match[1];
    
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
  
  let highlighted = escapeHtml(content);
  
  botList.forEach(bot => {
    const regex = new RegExp(`@${escapeRegExp(bot.name)}`, 'g');
    highlighted = highlighted.replace(
      regex,
      `<span class="mention" data-bot-id="${bot.id}">@${bot.name}</span>`
    );
  });
  
  return highlighted;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
