<template>
  <div class="chat-room">
    <!-- 顶部栏 -->
    <div class="header">
      <h1>🤖 Agent Monitor</h1>
      <div class="header-actions">
        <el-button @click="showBotPanel = true" type="primary">
          🛠️ 机器人管理
        </el-button>
        <el-button @click="showSearch = !showSearch">
          🔍 搜索
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <SearchBar v-if="showSearch" />

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef" @scroll="handleScroll">
      <div v-if="isLoadingMore" class="loading-more">加载中...</div>
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :bots="bots"
      />
    </div>

    <!-- 输入框 -->
    <MessageInput @send="handleSend" :bots="bots" />

    <!-- 机器人面板 -->
    <BotPanel
      v-model="showBotPanel"
      :bots="bots"
      @update-bots="loadBots"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useChatStore } from '../stores/chat';
import { useBotsStore } from '../stores/bots';
import { initSocket, getHistory, sendMessage, getBotList } from '../api/socket';
import MessageItem from './MessageItem.vue';
import MessageInput from './MessageInput.vue';
import BotPanel from './BotPanel.vue';
import SearchBar from './SearchBar.vue';

const chatStore = useChatStore();
const botsStore = useBotsStore();

const messages = chatStore.messages;
const bots = botsStore.bots;
const showBotPanel = ref(false);
const showSearch = ref(false);
const messageListRef = ref(null);
const isLoadingMore = ref(false);

onMounted(async () => {
  // 初始化 Socket
  initSocket({
    onConnect: () => {
      loadHistory();
      loadBots();
    },
    onNewMessage: (message) => {
      chatStore.addMessage(message);
      scrollToBottom();
    },
    onAgentResponse: (data) => {
      if (data.status === 'thinking') {
        chatStore.setAgentStatus(data.bot_id, 'thinking');
      } else {
        chatStore.clearAgentStatus(data.bot_id);
      }
    }
  });
});

async function loadHistory() {
  try {
    const history = await getHistory(30);
    chatStore.setMessages(history);
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('加载历史消息失败:', error);
  }
}

async function loadBots() {
  try {
    const botList = await getBotList();
    botsStore.setBots(botList);
  } catch (error) {
    console.error('加载机器人列表失败:', error);
  }
}

async function handleSend(content, imageUrl, mentions) {
  try {
    await sendMessage(content, imageUrl, mentions);
  } catch (error) {
    console.error('发送消息失败:', error);
    alert('发送失败：' + error.message);
  }
}

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

async function handleScroll(event) {
  const el = event.target;
  if (el.scrollTop < 100 && !isLoadingMore.value) {
    const firstMessage = messages.value[0];
    if (firstMessage) {
      await loadMoreMessages(firstMessage.id);
    }
  }
}

async function loadMoreMessages(beforeId) {
  try {
    isLoadingMore.value = true;
    const { loadMore } = await import('../api/socket');
    const moreMessages = await loadMore(beforeId, 30);
    if (moreMessages.length > 0) {
      chatStore.prependMessages(moreMessages);
    }
  } catch (error) {
    console.error('加载更多消息失败:', error);
  } finally {
    isLoadingMore.value = false;
  }
}
</script>

<style scoped>
.chat-room {
  width: 100%;
  height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

.header h1 {
  font-size: 20px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: #f9f9f9;
}

.loading-more {
  text-align: center;
  padding: 12px;
  color: #999;
  font-size: 14px;
}
</style>
