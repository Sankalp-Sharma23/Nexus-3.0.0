/** IMPORTANT NOTE:
 * server/socket/WhiteboardSocket.js  –  Real-time Whiteboard collaboration
 *
 * Rooms are persisted to data/wb-rooms.json so they survive server restarts.
 *
 * Room shape (in-memory):
 *   {
 *     hostUserId  : string,
 *     template    : string,
 *     members     : Map<userId → { socketId|null, displayName, color }>,
 *     strokes     : StrokeObj[],
 *     textEls     : TextElementObj[],
 *     pendingInvites : Set<userId>,
 *     createdAt   : string (ISO),
 *     lastActive  : number (Date.now)
 *   }
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Colour palette ────────────────────────────────────────────────────────── //
const USER_COLORS = [
  '#8b5cf6','#3b82f6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#f97316','#06b6d4',
];

// ── Persistence ───────────────────────────────────────────────────────────── //
const ROOMS_FILE    = path.join(__dirname, '..', 'data', 'wb-rooms.json');
const SAVE_DEBOUNCE = 2000; // ms – batch writes

let _saveTimer = null;
function scheduleSave () {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    persistRooms();
  }, SAVE_DEBOUNCE);
}

function persistRooms () {
  try {
    const obj = {};
    for (const [code, room] of rooms.entries()) {
      obj[code] = {
        hostUserId : room.hostUserId,
        template   : room.template,
        // members: save display-name + colour only; socketId is transient
        members    : Object.fromEntries(
          [...room.members.entries()].map(([uid, m]) => [uid, { displayName: m.displayName, color: m.color }])
        ),
        strokes    : room.strokes,
        textEls    : room.textEls,
        boardData  : room.boardData  || null,
        createdAt  : room.createdAt,
        lastActive : room.lastActive,
      };
    }
    fs.mkdirSync(path.dirname(ROOMS_FILE), { recursive: true });
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('[whiteboard] Could not save rooms:', e.message);
  }
}

function loadRooms () {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return;
    const raw    = fs.readFileSync(ROOMS_FILE, 'utf8');
    const obj    = JSON.parse(raw);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // discard rooms older than 24 h
    for (const [code, r] of Object.entries(obj)) {
      if (r.lastActive && r.lastActive < cutoff) continue;
      const membersMap = new Map(
        Object.entries(r.members || {}).map(([uid, m]) => [uid, { socketId: null, displayName: m.displayName, color: m.color }])
      );
      rooms.set(code, {
        hostUserId    : r.hostUserId,
        template      : r.template,
        members       : membersMap,
        strokes       : r.strokes  || [],
        textEls       : r.textEls  || [],
        pendingInvites: new Set(),
        createdAt     : r.createdAt || new Date().toISOString(),
        lastActive    : r.lastActive || Date.now(),
        boardData     : r.boardData  || null,
      });
    }
    if (rooms.size) console.log(`[whiteboard] Loaded ${rooms.size} persisted room(s) from disk.`);
  } catch (e) {
    console.warn('[whiteboard] Could not load rooms:', e.message);
  }
}

function touchRoom (room) {
  room.lastActive = Date.now();
  scheduleSave();
}

// ── In-memory stores ──────────────────────────────────────────────────────── //
const rooms       = new Map(); // roomCode  → room
const userSockets = new Map(); // userId    → socketId
const socketUsers = new Map(); // socketId  → { userId, displayName }

// Load persisted rooms at module init
loadRooms();

// ── Helpers ───────────────────────────────────────────────────────────────── //
function makeRoomCode () {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function pickColor (room) {
  return USER_COLORS[room.members.size % USER_COLORS.length];
}

function roomPublicMembers (room) {
  return [...room.members.entries()].map(([userId, m]) => ({
    userId,
    displayName : m.displayName,
    color       : m.color,
    isHost      : userId === room.hostUserId,
  }));
}

// ── Main export ───────────────────────────────────────────────────────────── //
/**
 * @param {import('socket.io').Server} io
 */
function registerWhiteboardSocket (io) {

  io.on('connection', (socket) => {

    /* ── register_user ──────────────────────────────────────────────────── */
    socket.on('register_user', ({ userId, displayName }) => {
      if (!userId) return;
      // If this user was previously registered, clean up old socket
      const oldSocketId = userSockets.get(userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        socketUsers.delete(oldSocketId);
      }
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, { userId, displayName: displayName || userId });
      socket.emit('registered', { userId, socketId: socket.id });
    });

    /* ── create_room ────────────────────────────────────────────────────── */
    socket.on('create_room', ({ template = 'blank' } = {}) => {
      const info = socketUsers.get(socket.id);
      if (!info) return socket.emit('error_msg', 'Not registered. Emit register_user first.');

      const { userId, displayName } = info;
      const roomCode = makeRoomCode();

      const room = {
        hostUserId    : userId,
        template,
        members       : new Map(),
        strokes       : [],
        textEls       : [],
        pendingInvites: new Set(),
        createdAt     : new Date().toISOString(),
        lastActive    : Date.now(),
      };

      // Add host as first member
      room.members.set(userId, { socketId: socket.id, displayName, color: USER_COLORS[0] });
      rooms.set(roomCode, room);
      persistRooms(); // save immediately — don't wait for debounce

      socket.join(roomCode);
      socket.emit('room_created', {
        roomCode,
        template,
        members: roomPublicMembers(room),
      });
    });

    /* ── invite_user ────────────────────────────────────────────────────── */
    socket.on('invite_user', ({ roomCode, targetUserId }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error_msg', `Room ${roomCode} not found.`);

      const info = socketUsers.get(socket.id);
      if (!info || info.userId !== room.hostUserId)
        return socket.emit('error_msg', 'Only the host can invite users.');

      if (room.members.has(targetUserId))
        return socket.emit('error_msg', 'User is already in the room.');

      const targetSocketId = userSockets.get(targetUserId);
      if (!targetSocketId)
        return socket.emit('error_msg', `User "${targetUserId}" is not online right now.`);

      room.pendingInvites.add(targetUserId);

      io.to(targetSocketId).emit('room_invite', {
        roomCode,
        template   : room.template,
        hostUserId : room.hostUserId,
        hostName   : info.displayName,
      });

      socket.emit('invite_sent', { targetUserId, roomCode });
    });

    /* ── accept_invite ──────────────────────────────────────────────────── */
    socket.on('accept_invite', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error_msg', `Room ${roomCode} not found.`);

      const info = socketUsers.get(socket.id);
      if (!info) return socket.emit('error_msg', 'Not registered.');

      const { userId, displayName } = info;

      // Also allow direct join by code (no invite required)
      room.pendingInvites.delete(userId);

      if (!room.members.has(userId)) {
        room.members.set(userId, {
          socketId   : socket.id,
          displayName,
          color      : pickColor(room),
        });
      }

      socket.join(roomCode);
      socket.emit('join_confirmed', {
        roomCode,
        template    : room.template,
        members     : roomPublicMembers(room),
        strokes     : room.strokes,
        textEls     : room.textEls,
        yourColor   : room.members.get(userId).color,
      });

      // Notify all other room members
      socket.to(roomCode).emit('user_joined', {
        userId,
        displayName,
        color   : room.members.get(userId).color,
        members : roomPublicMembers(room),
      });

      // Notify host that invite was accepted
      const hostSocketId = userSockets.get(room.hostUserId);
      if (hostSocketId && hostSocketId !== socket.id) {
        io.to(hostSocketId).emit('invite_accepted', { userId, displayName, roomCode });
      }
    });

    /* ── reject_invite ──────────────────────────────────────────────────── */
    socket.on('reject_invite', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const info = socketUsers.get(socket.id);
      if (!info) return;

      room.pendingInvites.delete(info.userId);

      const hostSocketId = userSockets.get(room.hostUserId);
      if (hostSocketId) {
        io.to(hostSocketId).emit('invite_rejected', {
          userId      : info.userId,
          displayName : info.displayName,
          roomCode,
        });
      }
    });

    /* ── join_room  (join by code – no invite needed) ───────────────────── */
    socket.on('join_room', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error_msg', `Room "${roomCode}" does not exist.`);

      // Auto-register if socket reconnected and register_user wasn't re-emitted yet
      let info = socketUsers.get(socket.id);
      if (!info) {
        const guestId = 'guest_' + socket.id.substring(0, 8);
        info = { userId: guestId, displayName: 'Guest' };
        userSockets.set(guestId, socket.id);
        socketUsers.set(socket.id, info);
      }

      const { userId, displayName } = info;

      if (!room.members.has(userId)) {
        room.members.set(userId, {
          socketId   : socket.id,
          displayName,
          color      : pickColor(room),
        });
        persistRooms(); // BUG-FIX: persist new member immediately (not just on next draw)
      } else {
        // Re-connecting — update socketId
        room.members.get(userId).socketId = socket.id;
      }

      socket.join(roomCode);
      socket.emit('join_confirmed', {
        roomCode,
        template  : room.template,
        members   : roomPublicMembers(room),
        strokes   : room.strokes,
        textEls   : room.textEls,
        boardData : room.boardData || null,
        yourColor : room.members.get(userId).color,
      });

      socket.to(roomCode).emit('user_joined', {
        userId,
        displayName,
        color   : room.members.get(userId).color,
        members : roomPublicMembers(room),
      });
    });

    /* ── draw_stroke ────────────────────────────────────────────────────── */
    socket.on('draw_stroke', ({ roomCode, stroke }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.strokes.push(stroke);
      if (room.strokes.length > 2000) room.strokes = room.strokes.slice(-2000);
      touchRoom(room);

      socket.to(roomCode).emit('remote_stroke', { stroke });
    });

    /* ── add_text_element ───────────────────────────────────────────── */
    socket.on('add_text_element', ({ roomCode, element }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.textEls.push(element);
      touchRoom(room);

      socket.to(roomCode).emit('remote_text_element', { element });
    });

    /* ── cursor_move ────────────────────────────────────────────────────── */
    socket.on('cursor_move', ({ roomCode, x, y }) => {
      const info = socketUsers.get(socket.id);
      if (!info) return;
      const room = rooms.get(roomCode);
      const member = room?.members.get(info.userId);
      socket.to(roomCode).emit('remote_cursor', {
        userId      : info.userId,
        displayName : info.displayName,
        color       : member?.color || '#8b5cf6',
        x,
        y,
      });
    });

    /* ── clear_canvas ───────────────────────────────────────────────────── */
    socket.on('clear_canvas', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      room.strokes = [];
      room.textEls = [];
      persistRooms();
      // Broadcast to all OTHER room members (sender already cleared locally)
      socket.to(roomCode).emit('canvas_cleared');
    });

    /* ── remove_user ────────────────────────────────────────────────────── */
    socket.on('remove_user', ({ roomCode, targetUserId }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error_msg', 'Room not found.');

      const info = socketUsers.get(socket.id);
      if (!info || info.userId !== room.hostUserId)
        return socket.emit('error_msg', 'Only the host can remove users.');

      if (!room.members.has(targetUserId))
        return socket.emit('error_msg', 'User not in this room.');

      const targetSocketId = room.members.get(targetUserId).socketId;
      room.members.delete(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit('you_were_removed', { roomCode });
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        targetSocket?.leave(roomCode);
      }

      io.to(roomCode).emit('user_left', {
        userId  : targetUserId,
        members : roomPublicMembers(room),
      });
    });

    /* ── leave_room ─────────────────────────────────────────────────────── */
    socket.on('leave_room', ({ roomCode }) => {
      _leaveRoom(socket, roomCode, io);
    });
    /* ── board_state (DatabaseBoard / ComponentTree full-state sync) ───── */
    socket.on('board_state', ({ roomCode, data }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      room.boardData = data;
      touchRoom(room);
      socket.to(roomCode).emit('remote_board_state', { data });
    });
    /* ── get_canvas_state ───────────────────────────────────────────────── */
    socket.on('get_canvas_state', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error_msg', 'Room not found.');
      socket.emit('canvas_state', { strokes: room.strokes, textEls: room.textEls });
    });

    /* ── disconnect ─────────────────────────────────────────────────────── */
    socket.on('disconnect', () => {
      const info = socketUsers.get(socket.id);
      if (!info) return;

      const { userId } = info;
      socketUsers.delete(socket.id);
      if (userSockets.get(userId) === socket.id) userSockets.delete(userId);

      // Null out socketId — keep room data intact (rooms are long-lived)
      for (const [roomCode, room] of rooms.entries()) {
        if (room.members.has(userId)) {
          room.members.get(userId).socketId = null;
          io.to(roomCode).emit('user_left', {
            userId,
            members : roomPublicMembers(room),
          });
        }
      }
    });

  });
}

function _leaveRoom (socket, roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const info = socketUsers.get(socket.id);
  if (!info) return;

  const { userId } = info;

  // Mark member as offline but KEEP them in the room — rooms are long-lived
  if (room.members.has(userId)) {
    room.members.get(userId).socketId = null;
  }
  socket.leave(roomCode);

  io.to(roomCode).emit('user_left', {
    userId,
    members : roomPublicMembers(room),
  });
  // Do NOT delete the room — it persists until 24 h expiry
}

module.exports = { registerWhiteboardSocket };
