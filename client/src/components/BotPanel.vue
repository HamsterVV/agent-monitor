<template>
  <el-dialog
    v-model="dialogVisible"
    title="机器人管理"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="bot-panel">
      <el-button type="primary" @click="showCreateForm = true" style="margin-bottom: 16px;">
        + 创建机器人
      </el-button>

      <!-- 机器人列表 -->
      <div class="bot-list">
        <div v-for="bot in bots" :key="bot.id" class="bot-item">
          <div class="bot-info">
            <span class="avatar">{{ bot.avatar || '🤖' }}</span>
            <div class="details">
              <div class="name">{{ bot.name }}</div>
              <div class="description">{{ bot.description || '无描述' }}</div>
              <div class="agent-id">Agent: {{ bot.agent_id }}</div>
            </div>
          </div>
          <div class="bot-actions">
            <el-tag :type="bot.is_active ? 'success' : 'info'" size="small">
              {{ bot.is_active ? '启用' : '禁用' }}
            </el-tag>
            <el-button size="small" @click="toggleBot(bot)">
              {{ bot.is_active ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" @click="editBot(bot)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteBot(bot)">删除</el-button>
          </div>
        </div>
      </div>

      <!-- 创建/编辑表单 -->
      <el-dialog
        v-model="showCreateForm"
        :title="editingBot ? '编辑机器人' : '创建机器人'"
        width="400px"
        append-to-body
      >
        <el-form :model="formData" label-width="80px">
          <el-form-item label="名称" required>
            <el-input v-model="formData.name" placeholder="如：BotA" />
          </el-form-item>
          <el-form-item label="Agent" required>
            <el-select v-model="formData.agent_id" placeholder="选择 Agent" style="width: 100%;">
              <el-option
                v-for="agent in agents"
                :key="agent.id"
                :label="agent.name"
                :value="agent.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="头像">
            <el-input v-model="formData.avatar" placeholder="emoji 或 URL，默认🤖" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="formData.description"
              type="textarea"
              placeholder="机器人描述（可选）"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateForm = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </template>
      </el-dialog>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { getBotList, getAgentList } from '../api/socket';

const props = defineProps({
  modelValue: Boolean,
  bots: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'update-bots']);

const dialogVisible = ref(props.modelValue);
const showCreateForm = ref(false);
const editingBot = ref(null);
const agents = ref([]);

const formData = ref({
  name: '',
  agent_id: '',
  avatar: '🤖',
  description: ''
});

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val;
});

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

onMounted(async () => {
  try {
    const agentList = await getAgentList();
    agents.value = agentList;
  } catch (error) {
    console.error('加载 Agent 列表失败:', error);
  }
});

function editBot(bot) {
  editingBot.value = bot;
  formData.value = {
    name: bot.name,
    agent_id: bot.agent_id,
    avatar: bot.avatar || '🤖',
    description: bot.description || ''
  };
  showCreateForm.value = true;
}

async function toggleBot(bot) {
  try {
    const res = await fetch(`/api/bots/${bot.id}/toggle`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (data.success) {
      emit('update-bots');
    }
  } catch (error) {
    console.error('切换状态失败:', error);
  }
}

async function deleteBot(bot) {
  if (!confirm(`确定要删除机器人 "${bot.name}" 吗？`)) return;
  
  try {
    const res = await fetch(`/api/bots/${bot.id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      emit('update-bots');
    }
  } catch (error) {
    console.error('删除失败:', error);
  }
}

async function submitForm() {
  if (!formData.value.name || !formData.value.agent_id) {
    alert('名称和 Agent 是必填项');
    return;
  }

  try {
    const url = editingBot.value ? `/api/bots/${editingBot.value.id}` : '/api/bots';
    const method = editingBot.value ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    });
    
    const data = await res.json();
    if (data.success) {
      showCreateForm.value = false;
      editingBot.value = null;
      formData.value = { name: '', agent_id: '', avatar: '🤖', description: '' };
      emit('update-bots');
    } else {
      alert(data.error || '操作失败');
    }
  } catch (error) {
    console.error('提交失败:', error);
    alert('操作失败：' + error.message);
  }
}
</script>

<style scoped>
.bot-panel {
  max-height: 400px;
  overflow-y: auto;
}

.bot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.bot-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bot-info .avatar {
  font-size: 24px;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.details .name {
  font-weight: 600;
  color: #333;
}

.details .description {
  font-size: 12px;
  color: #666;
}

.details .agent-id {
  font-size: 11px;
  color: #999;
}

.bot-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
