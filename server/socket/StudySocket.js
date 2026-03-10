'use strict';

/**
 * server/socket/StudySocket.js
 * Live "students studying now" counter via Socket.io.
 * Piggybacks on the main io instance (same as WhiteboardSocket).
 *
 * Client events:
 *   study:start  { userId }  — emitted when Pomodoro timer starts
 *   study:stop   { userId }  — emitted when timer stops / completes
 *
 * Server → client:
 *   study:count  { count }   — broadcast to ALL connected clients
 */

const socketToUser = new Map(); // socketId → userId
const studyingSet  = new Set(); // userId strings currently studying

function registerStudySocket(io) {
  io.on('connection', (socket) => {
    // Send current count to newly connected client
    socket.emit('study:count', { count: studyingSet.size });

    socket.on('study:start', ({ userId } = {}) => {
      if (!userId) return;
      socketToUser.set(socket.id, userId);
      studyingSet.add(userId);
      io.emit('study:count', { count: studyingSet.size });
    });

    socket.on('study:stop', ({ userId } = {}) => {
      if (!userId) return;
      socketToUser.delete(socket.id);
      studyingSet.delete(userId);
      io.emit('study:count', { count: studyingSet.size });
    });

    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        socketToUser.delete(socket.id);
        studyingSet.delete(userId);
        io.emit('study:count', { count: studyingSet.size });
      }
    });
  });
}

module.exports = { registerStudySocket };
