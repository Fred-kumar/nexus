const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { pushNotificationToUsers } = require('../services/notificationService');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const logger = require('../utils/logger');

// @desc    Send message
// @route   POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, type = 'text', replyTo, media, location, poll, mentions } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': req.user.id,
    }).populate('participants.user', 'name username pushSubscriptions settings');

    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Check slow mode
    if (chat.settings.slowMode > 0) {
      const lastMsg = await Message.findOne({ chat: chatId, sender: req.user.id }).sort('-createdAt');
      if (lastMsg) {
        const elapsed = (Date.now() - lastMsg.createdAt) / 1000;
        if (elapsed < chat.settings.slowMode) {
          return res.status(429).json({
            error: `Slow mode: wait ${Math.ceil(chat.settings.slowMode - elapsed)} more seconds`,
          });
        }
      }
    }

    const msg = await Message.create({
      chat: chatId,
      sender: req.user.id,
      type,
      content,
      replyTo,
      media,
      location,
      poll,
      mentions,
      isAI: false,
    });

    await msg.populate([
      { path: 'sender', select: 'name username avatar' },
      { path: 'replyTo', select: 'content sender type', populate: { path: 'sender', select: 'name' } },
    ]);

    // Update chat
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: msg._id,
      lastActivity: new Date(),
    });

    // Invalidate chat cache
    await cacheDel(`chat:${chatId}:messages`);

    // Emit via socket
    req.io.to(chatId).emit('new_message', msg);

    // Push notifications to offline participants
    const offlineParticipants = chat.participants
      .filter((p) => p.user._id.toString() !== req.user.id.toString() && p.user.status === 'offline')
      .map((p) => p.user);

    if (offlineParticipants.length > 0) {
      await pushNotificationToUsers(offlineParticipants, {
        title: chat.type === 'dm' ? msg.sender.name : `${chat.name}: ${msg.sender.name}`,
        body: type === 'text' ? content : `📎 Sent ${type}`,
        data: { chatId, messageId: msg._id, type: 'message' },
        icon: msg.sender.avatar?.url || '/icon-192.png',
        badge: '/badge.png',
        tag: `chat-${chatId}`,
      });
    }

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    logger.error('sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const isMember = await Chat.exists({ _id: chatId, 'participants.user': req.user.id });
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const query = { chat: chatId, deleted: false };
    if (before) query._id = { $lt: before };
    if (req.user.id) {
      query.deletedFor = { $ne: req.user.id };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('sender', 'name username avatar')
      .populate('replyTo', 'content sender type media', null, { populate: { path: 'sender', select: 'name' } })
      .lean();

    const total = await Message.countDocuments(query);

    // Mark as read
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user.id }, 'readBy.user': { $ne: req.user.id } },
      { $push: { readBy: { user: req.user.id, readAt: new Date() } } }
    );

    req.io.to(chatId).emit('messages_read', { chatId, userId: req.user.id });

    res.json({
      success: true,
      messages: messages.reverse(),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error('getMessages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// @desc    Edit message
// @route   PUT /api/messages/:id
const editMessage = async (req, res) => {
  try {
    const msg = await Message.findOne({ _id: req.params.id, sender: req.user.id });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    msg.editHistory.push({ content: msg.content, editedAt: msg.updatedAt });
    msg.content = req.body.content;
    msg.edited = true;
    msg.editedAt = new Date();
    await msg.save();

    req.io.to(msg.chat.toString()).emit('message_edited', { messageId: msg._id, content: msg.content, editedAt: msg.editedAt });

    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
const deleteMessage = async (req, res) => {
  try {
    const { forAll } = req.query;
    const msg = await Message.findOne({ _id: req.params.id });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (forAll === 'true' && msg.sender.toString() === req.user.id) {
      msg.deleted = true;
      msg.deletedAt = new Date();
      msg.content = '';
      await msg.save();
      req.io.to(msg.chat.toString()).emit('message_deleted', { messageId: msg._id, forAll: true });
    } else {
      if (!msg.deletedFor.includes(req.user.id)) {
        msg.deletedFor.push(req.user.id);
        await msg.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// @desc    React to message
// @route   POST /api/messages/:id/react
const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      const idx = existing.users.indexOf(req.user.id);
      if (idx > -1) existing.users.splice(idx, 1);
      else existing.users.push(req.user.id);
      if (existing.users.length === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      msg.reactions.push({ emoji, users: [req.user.id] });
    }

    await msg.save();
    await msg.populate('reactions.users', 'name username');

    req.io.to(msg.chat.toString()).emit('reaction_update', { messageId: msg._id, reactions: msg.reactions });

    res.json({ success: true, reactions: msg.reactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to react' });
  }
};

// @desc    Forward message
// @route   POST /api/messages/:id/forward
const forwardMessage = async (req, res) => {
  try {
    const { targetChatIds } = req.body;
    const original = await Message.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Message not found' });

    const forwarded = await Promise.all(
      targetChatIds.map((chatId) =>
        Message.create({
          chat: chatId,
          sender: req.user.id,
          type: original.type,
          content: original.content,
          media: original.media,
          forwardedFrom: original._id,
        })
      )
    );

    targetChatIds.forEach((chatId, i) => req.io.to(chatId).emit('new_message', forwarded[i]));

    res.json({ success: true, forwarded: forwarded.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to forward message' });
  }
};

// @desc    Search messages
// @route   GET /api/messages/:chatId/search
const searchMessages = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const messages = await Message.find({
      chat: req.params.chatId,
      $text: { $search: q },
      deleted: false,
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .populate('sender', 'name username avatar');

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = { sendMessage, getMessages, editMessage, deleteMessage, reactToMessage, forwardMessage, searchMessages };
