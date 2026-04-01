<template>
  <div :class="['message', message.sender_type, { 'agent-response': message.is_agent_response }]">
    <div class="avatar">
      {{ message.sender_type === 'user' ? '👤' : getBotAvatar(message.sender_id) }}
    </div>
    <div class="message-content">
      <div class="message-header">
        <span class="sender-name">{{ message.sender_name }}</span>
        <span class="message-time">{{ formatTime(message.created_at) }}</span>
      </div>
      <div class="message-body">
        <span v-html="highlightedContent"></span>
        <img
          v-if="message.image_url"
          :src="message.image_url"
          class="message-image"
          @click="previewImage"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { highlightMentions } from '../utils/mention-parser';

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  bots: {
    type: Array,
    default: () => []
  }
});

const highlightedContent = computed(() => {
  return highlightMentions(props.message.content, props.bots);
});

function getBotAvatar(botId) {
  const bot = props.bots.find(b => String(b.id) === String(botId));
  return bot ? (bot.avatar || '🤖') : '🤖';
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  // 今天显示时间
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 昨天显示"昨天"
  if (diff < 48 * 60 * 60 * 1000) {
    return '昨天';
  }
  
  // 其他显示日期
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function previewImage() {
  // 简单实现，可以扩展为图片预览组件
  window.open(props.message.image_url, '_blank');
}
</script>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: white;
}

.message.user {
  background: #e6f7ff;
}

.message.bot {
  background: #f6ffed;
}

.message.agent-response {
  border-left: 3px solid #52c41a;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sender-name {
  font-weight: 600;
  color: #333;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.message-body {
  color: #333;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  margin-top: 8px;
  cursor: pointer;
  display: block;
}

.mention {
  color: #1890ff;
  font-weight: 500;
  background: rgba(24, 144, 255, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
