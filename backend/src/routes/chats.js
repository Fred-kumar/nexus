const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// Get all chats for current user
router.get('/', protect, async (req, res) => {
  const chats = await Chat.find({ 'participants.user': req.user.id, isActive: true })
    .sort({ lastActivity: -1 })
    .populate('participants.user', 'name username avatar status lastSeen')
    .populate('lastMessage')
    .lean();

  // Add unread count per chat
  const Message = require('../models/Message');
  const enriched = await Promise.all(chats.map(async (c) => {
    const me = c.participants.find((p) => p.user?._id?.toString() === req.user.id.toString());
    const unread = await Message.countDocuments({
      chat: c._id,
      createdAt: { $gt: me?.joinedAt || new Date(0) },
      sender: { $ne: req.user.id },
      'readBy.user': { $ne: req.user.id },
      deleted: false,
    });
    return { ...c, unreadCount: unread };
  }));

  res.json({ success: true, chats: enriched });
});

// Get single chat
router.get('/:id', protect, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, 'participants.user': req.user.id })
    .populate('participants.user', 'name username avatar status lastSeen')
    .populate('lastMessage')
    .populate('pinnedMessage');
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  res.json({ success: true, chat });
});

// Create DM
router.post('/dm', protect, async (req, res) => {
  const { targetUserId } = req.body;
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // Check for existing DM
  let chat = await Chat.findOne({
    type: 'dm',
    'participants.user': { $all: [req.user.id, targetUserId] },
    $expr: { $eq: [{ $size: '$participants' }, 2] },
  });

  if (!chat) {
    chat = await Chat.create({
      type: 'dm',
      participants: [
        { user: req.user.id, role: 'member' },
        { user: targetUserId, role: 'member' },
      ],
    });
  }

  await chat.populate('participants.user', 'name username avatar status');
  res.json({ success: true, chat });
});

// Create group
router.post('/group', protect, async (req, res) => {
  const { name, description, memberIds, isPublic } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name required' });

  const members = [req.user.id, ...(memberIds || [])];
  const participants = members.map((id, i) => ({
    user: id,
    role: i === 0 ? 'owner' : 'member',
  }));

  const chat = await Chat.create({
    type: 'group',
    name,
    description,
    participants,
    settings: {
      isPublic: isPublic || false,
      inviteLink: uuidv4(),
    },
  });

  await chat.populate('participants.user', 'name username avatar');
  req.io.to(chat._id.toString()).emit('group_created', { chat });

  res.status(201).json({ success: true, chat });
});

// Create channel
router.post('/channel', protect, async (req, res) => {
  const { name, description, isPublic } = req.body;
  if (!name) return res.status(400).json({ error: 'Channel name required' });

  const chat = await Chat.create({
    type: 'channel',
    name,
    description,
    participants: [{ user: req.user.id, role: 'owner' }],
    settings: { isPublic: isPublic !== false, inviteLink: uuidv4(), sendMessages: 'admins_only' },
  });

  res.status(201).json({ success: true, chat });
});

// Add member to group
router.post('/:id/members', protect, async (req, res) => {
  const { userIds } = req.body;
  const chat = await Chat.findOne({ _id: req.params.id, 'participants.user': req.user.id });
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const me = chat.participants.find((p) => p.user.toString() === req.user.id.toString());
  if (!['owner', 'admin'].includes(me?.role)) return res.status(403).json({ error: 'Not authorized' });

  userIds.forEach((id) => {
    if (!chat.participants.find((p) => p.user.toString() === id)) {
      chat.participants.push({ user: id, role: 'member' });
    }
  });

  await chat.save();
  await chat.populate('participants.user', 'name username avatar');
  req.io.to(req.params.id).emit('members_added', { chatId: req.params.id, participants: chat.participants });

  res.json({ success: true, chat });
});

// Remove member
router.delete('/:id/members/:userId', protect, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id });
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const me = chat.participants.find((p) => p.user.toString() === req.user.id.toString());
  const isLeaving = req.params.userId === req.user.id;
  if (!isLeaving && !['owner', 'admin'].includes(me?.role)) return res.status(403).json({ error: 'Not authorized' });

  chat.participants = chat.participants.filter((p) => p.user.toString() !== req.params.userId);
  await chat.save();

  req.io.to(req.params.id).emit('member_removed', { chatId: req.params.id, userId: req.params.userId });
  res.json({ success: true });
});

// Pin message in chat
router.put('/:id/pin-message', protect, async (req, res) => {
  const chat = await Chat.findByIdAndUpdate(
    req.params.id,
    { pinnedMessage: req.body.messageId },
    { new: true }
  );
  req.io.to(req.params.id).emit('message_pinned', { chatId: req.params.id, messageId: req.body.messageId });
  res.json({ success: true });
});

// Join via invite link
router.post('/join/:inviteLink', protect, async (req, res) => {
  const chat = await Chat.findOne({ 'settings.inviteLink': req.params.inviteLink });
  if (!chat) return res.status(404).json({ error: 'Invalid invite link' });

  const alreadyMember = chat.participants.find((p) => p.user.toString() === req.user.id);
  if (!alreadyMember) {
    if (chat.settings.joinApproval) {
      // TODO: send approval request
      return res.json({ success: true, message: 'Join request sent for approval' });
    }
    chat.participants.push({ user: req.user.id, role: 'member' });
    await chat.save();
    req.io.to(chat._id.toString()).emit('member_joined', { chatId: chat._id, userId: req.user.id });
  }

  await chat.populate('participants.user', 'name username avatar');
  res.json({ success: true, chat });
});

module.exports = router;
