const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get notifications
router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const query = { recipient: req.user.id };
  if (unreadOnly === 'true') query.read = false;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('sender', 'name username avatar');

  const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });

  res.json({ success: true, notifications, unreadCount });
});

// Mark all read
router.put('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
  res.json({ success: true });
});

// Mark specific read
router.put('/:id/read', protect, async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { read: true });
  res.json({ success: true });
});

// Delete notification
router.delete('/:id', protect, async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
  res.json({ success: true });
});

// Get VAPID public key (for client subscription)
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
