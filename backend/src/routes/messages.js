// ─── routes/messages.js ──────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendMessage, getMessages, editMessage,
  deleteMessage, reactToMessage, forwardMessage, searchMessages,
} = require('../controllers/messageController');

router.post('/', protect, sendMessage);
router.get('/:chatId', protect, getMessages);
router.get('/:chatId/search', protect, searchMessages);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/:id/react', protect, reactToMessage);
router.post('/:id/forward', protect, forwardMessage);

module.exports = router;
