import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const isLoading = ref(false);
  const agentStatus = ref({}); // { botId: 'thinking' | 'responded' | 'error' }
  
  function addMessage(message) {
    console.log('[ChatStore] addMessage:', message);
    messages.value.push(message);
    console.log('[ChatStore] messages 现在长度:', messages.value.length);
  }
  
  function setMessages(newMessages) {
    console.log('[ChatStore] setMessages:', newMessages.length, '条');
    messages.value = newMessages;
  }
  
  function prependMessages(newMessages) {
    console.log('[ChatStore] prependMessages:', newMessages.length, '条');
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
