/**
 * src/socket.js  –  Singleton socket.io-client connection
 *
 * Import this everywhere in the app to share a single socket instance.
 *
 *   import socket from '../socket';
 *   socket.emit('register_user', { userId, displayName });
 */

import { io } from 'socket.io-client';

// In dev, Vite proxies API calls but socket.io needs the direct server URL.
// In production, connect to the same origin (empty string).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const socket = io(SOCKET_URL, {
  autoConnect      : true,
  reconnection     : true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
});

export default socket;
