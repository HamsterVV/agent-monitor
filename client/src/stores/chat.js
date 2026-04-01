import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const isLoading = ref(false);
  const agentStatus = ref({}); // { botId: 'thinking' | 'responded' | 'error' }
  
  function addMessage(message) {
    messages.value.push(message);
  }
  
  function setMessages(newMessages) {
    messages.value = newMessages;
  }
  
  function prependMessages(newMessages) {
    messages.value = [...newMessages, ...messages.value];
  }
  
  function setAgentStatus(botId, status) {
    agentStatus.value[botId] = status;
  }
  
  function clearAgentStatus(botId) {
    delete agentStatus.value[botId];
  }
  
  return {
    messages,
    isLoading,
    agentStatus,
    addMessage,
    setMessages,
    prependMessages,
    setAgentStatus,
    clearAgentStatus
  };
});
