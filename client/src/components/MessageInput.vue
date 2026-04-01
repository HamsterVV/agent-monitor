<template>
  <div class="message-input">
    <!-- 图片预览 -->
    <div v-if="selectedImage" class="image-preview">
      <img :src="imagePreviewUrl" />
      <button class="remove-image" @click="clearImage">×</button>
    </div>

    <!-- @ 提示下拉框 -->
    <div v-if="showMentionDropdown" class="mention-dropdown">
      <div
        v-for="(bot, index) in filteredBots"
        :key="bot.id"
        :class="['bot-item', { selected: index === selectedIndex }]"
        @click="selectBot(bot)"
      >
        <span class="avatar">{{ bot.avatar || '🤖' }}</span>
        <span class="name">{{ bot.name }}</span>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <textarea
        v-model="inputText"
        @input="handleInput"
        @keydown="handleKeydown"
        placeholder="输入消息，@ 机器人..."
        rows="3"
      />
      
      <div class="input-actions">
        <div class="left-actions">
          <input
            type="file"
            accept="image/*"
            ref="fileInput"
            @change="handleImageSelect"
            style="display: none"
          />
          <el-button @click="$refs.fileInput.click()" size="small">
            📷 图片
          </el-button>
        </div>
        
        <el-button
          type="primary"
          @click="sendMessage"
          :disabled="!canSend"
          size="default"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { parseMentions } from '../utils/mention-parser';

const props = defineProps({
  bots: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['send']);

const inputText = ref('');
const selectedImage = ref(null);
const imagePreviewUrl = ref('');
const showMentionDropdown = ref(false);
const mentionQuery = ref('');
const selectedIndex = ref(0);

const filteredBots = computed(() => {
  if (!mentionQuery.value) return props.bots.filter(b => b.is_active);
  return props.bots.filter(bot =>
    bot.is_active && bot.name.toLowerCase().includes(mentionQuery.value.toLowerCase())
  );
});

const canSend = computed(() => {
  return inputText.value.trim() || selectedImage.value;
});

function handleInput() {
  const atMatch = inputText.value.match(/@([^\s,，.。!！?？:：]+)$/);
  if (atMatch) {
    mentionQuery.value = atMatch[1];
    showMentionDropdown.value = true;
    selectedIndex.value = 0;
  } else {
    showMentionDropdown.value = false;
  }
}

function handleKeydown(event) {
  if (showMentionDropdown.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % filteredBots.value.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value - 1 + filteredBots.value.length) % filteredBots.value.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredBots.value[selectedIndex.value]) {
        selectBot(filteredBots.value[selectedIndex.value]);
      }
    } else if (event.key === 'Escape') {
      showMentionDropdown.value = false;
    }
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function selectBot(bot) {
  const beforeAt = inputText.value.replace(/@[^\s,，.。!！?？:：]+$/, '');
  inputText.value = `${beforeAt}@${bot.name} `;
  showMentionDropdown.value = false;
}

async function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB');
    return;
  }
  
  imagePreviewUrl.value = URL.createObjectURL(file);
  selectedImage.value = file;
}

function clearImage() {
  selectedImage.value = null;
  imagePreviewUrl.value = '';
}

async function sendMessage() {
  if (!canSend.value) return;
  
  const mentions = parseMentions(inputText.value, props.bots);
  
  let imageUrl = null;
  if (selectedImage.value) {
    const formData = new FormData();
    formData.append('image', selectedImage.value);
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      imageUrl = data.url;
    }
  }
  
  emit('send', inputText.value.trim(), imageUrl, mentions);
  
  inputText.value = '';
  clearImage();
}
</script>

<style scoped>
.message-input {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  background: white;
  position: relative;
}

.image-preview {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
}

.remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.mention-dropdown {
  position: absolute;
  bottom: 100%;
  left: 24px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  min-width: 150px;
}

.bot-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
}

.bot-item:hover,
.bot-item.selected {
  background: #f0f0f0;
}

.bot-item .avatar {
  margin-right: 8px;
  font-size: 16px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
}

textarea:focus {
  outline: none;
  border-color: #409EFF;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions {
  display: flex;
  gap: 8px;
}
</style>
