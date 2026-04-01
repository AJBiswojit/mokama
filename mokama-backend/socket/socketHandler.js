const jwt = require('jsonwebtoken');

// ── User socket map: userId → socketId
// Used to send events to specific users only
const userSocketMap = new Map();

// ── Helper: get socketId for a userId
const getSocketId = (userId) => userSocketMap.get(userId?.toString());

// ── Helper: emit to a specific user by userId
const emitToUser = (io, userId, event, data) => {
  const socketId = getSocketId(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false; // user is offline — that's fine
};

const initSocket = (io) => {

  // ── Auth middleware — validate JWT before connection ──
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // ── Register user in map ──
    userSocketMap.set(userId, socket.id);
    console.log(`🔌 Socket connected: ${socket.userRole} [${userId}] → ${socket.id}`);

    // ── Join a personal room for this user ──
    socket.join(userId);

    // ── Disconnect — remove from map ──
    socket.on('disconnect', () => {
      userSocketMap.delete(userId);
      console.log(`🔌 Socket disconnected: ${socket.userRole} [${userId}]`);
    });

    // ── Ping / health check ──
    socket.on('ping', () => {
      socket.emit('pong', { userId, time: Date.now() });
    });
  });
};

module.exports = { initSocket, emitToUser, getSocketId, userSocketMap };
