// ─── routes/users.js ─────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { cacheDel } = require('../config/redis');

// Search users
router.get('/search', protect, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ users: [] });
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
    ],
    _id: { $ne: req.user.id },
    isActive: true,
  }).select('name username avatar status lastSeen bio').limit(20);
  res.json({ users });
});

// Get user profile
router.get('/:username', protect, async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .select('name username avatar bio status lastSeen isVerified');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// Update own profile
router.put('/me/profile', protect, async (req, res) => {
  const allowed = ['name', 'bio', 'settings'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
  await cacheDel(`user:${req.user.id}`);
  res.json({ success: true, user });
});

// Add contact
router.post('/contacts/:userId', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { contacts: req.params.userId } });
  await cacheDel(`user:${req.user.id}`);
  res.json({ success: true });
});

// Remove contact
router.delete('/contacts/:userId', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $pull: { contacts: req.params.userId } });
  res.json({ success: true });
});

// Block user
router.post('/block/:userId', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { blockedUsers: req.params.userId } });
  res.json({ success: true });
});

// Save push subscription
router.post('/push-subscription', protect, async (req, res) => {
  const { subscription } = req.body;
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { pushSubscriptions: subscription } });
  res.json({ success: true, message: 'Push subscription saved' });
});

// Remove push subscription
router.delete('/push-subscription', protect, async (req, res) => {
  const { endpoint } = req.body;
  await User.findByIdAndUpdate(req.user.id, { $pull: { pushSubscriptions: { endpoint } } });
  res.json({ success: true });
});

module.exports = router;
