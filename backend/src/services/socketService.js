const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const onlineUsers = new Map(); // userId -> socketId[]
const typingUsers = new Map(); // chatId -> Set of userIds

const initSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.user = await User.findById(decoded.id).select('name username avatar status');
      if (!socket.user) return next(new Error('User not found'));
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId.toString();
    logger.info(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, []);
    onlineUsers.get(userId).push(socket.id);

    // Update user status
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });

    // Join all user's chats
    const chats = await Chat.find({ 'participants.user': userId }).select('_id');
    chats.forEach((c) => socket.join(c._id.toString()));

    // Broadcast online status to contacts
    socket.broadcast.emit('user_online', {
      userId,
      status: 'online',
      lastSeen: new Date(),
    });

    // ─── Events ────────────────────────────────────────────────

    // Join a specific chat room
    socket.on('join_chat', async (chatId) => {
      const isMember = await Chat.exists({ _id: chatId, 'participants.user': userId });
      if (isMember) {
        socket.join(chatId);
        socket.emit('joined_chat', { chatId });
      }
    });

    // Leave chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
    });

    // Typing indicator
    socket.on('typing_start', ({ chatId }) => {
      if (!typingUsers.has(chatId)) typingUsers.set(chatId, new Set());
      typingUsers.get(chatId).add(userId);
      socket.to(chatId).emit('user_typing', {
        chatId,
        userId,
        user: { name: socket.user.name, username: socket.user.username },
      });
    });

    socket.on('typing_stop', ({ chatId }) => {
      if (typingUsers.has(chatId)) typingUsers.get(chatId).delete(userId);
      socket.to(chatId).emit('user_stopped_typing', { chatId, userId });
    });

    // Message delivery ACK
    socket.on('message_delivered', async ({ messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $push: { deliveredTo: { user: userId, deliveredAt: new Date() } },
        });
      } catch (e) {}
    });

    // Mark messages as read
    socket.on('mark_read', async ({ chatId, messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, 'readBy.user': { $ne: userId } },
          { $push: { readBy: { user: userId, readAt: new Date() } } }
        );
        socket.to(chatId).emit('messages_read', { chatId, userId, messageIds });
      } catch (e) {}
    });

    // Voice/Video call signaling
    socket.on('call_offer', ({ targetUserId, offer, callType, chatId }) => {
      const targetSockets = onlineUsers.get(targetUserId);
      if (targetSockets?.length) {
        io.to(targetSockets[0]).emit('incoming_call', {
          from: { id: userId, name: socket.user.name, avatar: socket.user.avatar },
          offer,
          callType,
          chatId,
        });
      } else {
        socket.emit('call_failed', { reason: 'User is offline' });
      }
    });

    socket.on('call_answer', ({ targetUserId, answer }) => {
      const targetSockets = onlineUsers.get(targetUserId);
      if (targetSockets?.length) io.to(targetSockets[0]).emit('call_answered', { answer, from: userId });
    });

    socket.on('call_ice_candidate', ({ targetUserId, candidate }) => {
      const targetSockets = onlineUsers.get(targetUserId);
      if (targetSockets?.length) io.to(targetSockets[0]).emit('ice_candidate', { candidate, from: userId });
    });

    socket.on('call_reject', ({ targetUserId }) => {
      const targetSockets = onlineUsers.get(targetUserId);
      if (targetSockets?.length) io.to(targetSockets[0]).emit('call_rejected', { from: userId });
    });

    socket.on('call_end', ({ targetUserId }) => {
      const targetSockets = onlineUsers.get(targetUserId);
      if (targetSockets?.length) io.to(targetSockets[0]).emit('call_ended', { from: userId });
    });

    // Group management live events
    socket.on('group_member_added', ({ chatId, newMembers }) => {
      socket.to(chatId).emit('group_updated', { chatId, event: 'members_added', newMembers });
    });

    // Story view
    socket.on('story_viewed', ({ storyId, viewerId }) => {
      socket.to(`story:${storyId}`).emit('story_view', { viewerId });
    });

    // Presence: user sets status manually
    socket.on('set_status', async ({ status }) => {
      const allowed = ['online', 'away', 'busy'];
      if (!allowed.includes(status)) return;
      await User.findByIdAndUpdate(userId, { status });
      socket.broadcast.emit('user_status_change', { userId, status });
    });

    // ─── Disconnect ────────────────────────────────────────────

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId) || [];
      const remaining = sockets.filter((s) => s !== socket.id);
      if (remaining.length === 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen });
        socket.broadcast.emit('user_offline', { userId, lastSeen });
        logger.info(`❌ User disconnected: ${socket.user.username}`);
      } else {
        onlineUsers.set(userId, remaining);
      }
    });
  });

  // Helper: get online user count
  io.getOnlineCount = () => onlineUsers.size;
  io.isUserOnline = (userId) => onlineUsers.has(userId.toString());
  io.getUserSockets = (userId) => onlineUsers.get(userId.toString()) || [];
};

module.exports = { initSocket, onlineUsers };
