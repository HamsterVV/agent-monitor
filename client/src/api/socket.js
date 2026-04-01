import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

export function initSocket(handlers) {
  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => {
    console.log('[Socket] 已连接到:', SOCKET_URL);
    handlers.onConnect?.();
  });
  
  socket.on('disconnect', () => {
    console.log('[Socket] 已断开连接');
    handlers.onDisconnect?.();
  });
  
  socket.on('new_message', (message) => {
    console.log('[Socket] 收到 new_message:', message);
    handlers.onNewMessage?.(message);
  });
  
  socket.on('agent_response', (data) => {
    console.log('[Socket] 收到 agent_response:', data);
    handlers.onAgentResponse?.(data);
  });
  
  return socket;
}

export function getSocket() {
  return socket;
}

export function sendMessage(content, image_url, mentions) {
  return new Promise((resolve, reject) => {
    socket.emit('send_message', {
      content,
      image_url,
      mentions
    }, (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

export function getHistory(limit = 30) {
  return new Promise((resolve, reject) => {
    socket.emit('get_history', { limit }, (response) => {
      if (response.success) {
        resolve(response.messages);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

export function loadMore(beforeId, limit = 30) {
  return new Promise((resolve, reject) => {
    socket.emit('load_more', { beforeId, limit }, (response) => {
      if (response.success) {
        resolve(response.messages);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

export function getBotList() {
  return new Promise((resolve, reject) => {
    socket.emit('get_bot_list', (response) => {
      if (response.success) {
        resolve(response.bots);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

export function getAgentList() {
  return new Promise((resolve, reject) => {
    socket.emit('get_agent_list', (response) => {
      if (response.success) {
        resolve(response.agents);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}
