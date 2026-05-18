// ─── routes/calls.js ─────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Call history (stored in DB via socket events in production)
const calls = []; // In-memory for demo; use a Call model in production

router.get('/history', protect, async (req, res) => {
  res.json({ success: true, calls });
});

router.post('/initiate', protect, async (req, res) => {
  const { targetUserId, callType } = req.body;
  const call = {
    id: Date.now().toString(),
    caller: req.user.id,
    callee: targetUserId,
    type: callType,
    startedAt: new Date(),
    status: 'initiated',
  };
  calls.push(call);
  req.io.to(`user:${targetUserId}`).emit('incoming_call', {
    callId: call.id,
    callType,
    caller: { id: req.user.id, name: req.user.name },
  });
  res.json({ success: true, call });
});

module.exports = router;
