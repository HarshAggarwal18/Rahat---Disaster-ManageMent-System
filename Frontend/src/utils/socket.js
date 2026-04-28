import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiConfig';

const socketBaseUrl = API_BASE_URL.replace(/\/api$/, '');

export const socket = io(socketBaseUrl, {
  transports: ['websocket', 'polling']
});
