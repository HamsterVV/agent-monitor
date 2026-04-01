<template>
  <div class="search-bar">
    <div class="search-input">
      <el-input
        v-model="query"
        @input="debouncedSearch"
        placeholder="搜索消息..."
        prefix-icon="Search"
        clearable
      />
      <el-select v-model="senderFilter" @change="debouncedSearch" style="width: 100px; margin-left: 8px;">
        <el-option label="全部" value="" />
        <el-option label="祥子" value="user" />
        <el-option label="机器人" value="bot" />
      </el-select>
    </div>
    
    <div v-if="results.length" class="search-results">
      <div v-for="msg in results" :key="msg.id" class="result-item">
        <div class="result-header">
          <span class="sender" :class="msg.sender_type">{{ msg.sender_name }}</span>
          <span class="time">{{ formatTime(msg.created_at) }}</span>
        </div>
        <p class="content" v-html="highlightKeyword(msg.content, query)"></p>
      </div>
    </div>
    
    <div v-else-if="query" class="no-results">
      没有找到相关消息
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const query = ref('');
const senderFilter = ref('');
const results = ref([]);

let debounceTimer = null;

function debouncedSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(search, 300);
}

async function search() {
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  
  try {
    const params = new URLSearchParams({
      q: query.value,
      sender: senderFilter.value,
      limit: 50
    });
    
    const res = await fetch(`/api/messages/search?${params}`);
    const data = await res.json();
    if (data.success) {
      results.value = data.messages;
    }
  } catch (error) {
    console.error('搜索失败:', error);
  }
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN');
}

function highlightKeyword(content, keyword) {
  if (!keyword) return content;
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return content.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
</script>

<style scoped>
.search-bar {
  padding: 12px 24px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

.search-input {
  display: flex;
  gap: 8px;
}

.search-results {
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.result-item:last-child {
  border-bottom: none;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sender {
  font-weight: 600;
}

.sender.user {
  color: #1890ff;
}

.sender.bot {
  color: #52c41a;
}

.time {
  font-size: 12px;
  color: #999;
}

.content {
  margin: 0;
  color: #333;
  font-size: 14px;
  line-height: 1.5;
}

.content mark {
  background: #ffeb3b;
  padding: 2px 4px;
  border-radius: 2px;
}

.no-results {
  margin-top: 12px;
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
