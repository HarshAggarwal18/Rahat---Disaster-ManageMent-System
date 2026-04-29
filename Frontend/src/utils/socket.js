import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiConfig';
import { showNotification } from './notifications';

const socketBaseUrl = API_BASE_URL.replace(/\/api$/, '');

export const socket = io(socketBaseUrl, {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.info('Socket connected');
  showNotification('Realtime connection restored', 'success');
});

socket.on('disconnect', (reason) => {
  console.warn('Socket disconnected:', reason);
  if (reason !== 'io client disconnect') {
    showNotification('Realtime connection lost. Reconnecting...', 'warning');
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.info('Socket reconnected on attempt', attemptNumber);
  showNotification('Realtime connection re-established', 'success');
});

socket.on('connect_error', (error) => {
  console.error('Socket connect error:', error.message);
  showNotification('Realtime connection error. Check server availability.', 'error');
});
