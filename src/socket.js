
import { io } from 'socket.io-client'; // import the library connect frontend backend in real time 

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const socket = io(SOCKET_URL, {
  autoConnect      : true,
  reconnection     : true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
});

export default socket;


//it creates a Socket.IO client that connects the frontend to the backend 
// for real‑time communication (uses VITE_SOCKET_URL 
// or http://localhost:3001, falls back to polling if websocket 
// isn't available).