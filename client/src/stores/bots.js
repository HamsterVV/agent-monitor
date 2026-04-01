import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useBotsStore = defineStore('bots', () => {
  const bots = ref([]);
  
  const activeBots = computed(() => {
    return bots.value.filter(bot => bot.is_active);
  });
  
  function setBots(newBots) {
    bots.value = newBots;
  }
  
  function addBot(bot) {
    bots.value.push(bot);
  }
  
  function updateBot(updatedBot) {
    const index = bots.value.findIndex(b => b.id === updatedBot.id);
    if (index !== -1) {
      bots.value[index] = updatedBot;
    }
  }
  
  function removeBot(id) {
    bots.value = bots.value.filter(b => b.id !== id);
  }
  
  return {
    bots,
    activeBots,
    setBots,
    addBot,
    updateBot,
    removeBot
  };
});
