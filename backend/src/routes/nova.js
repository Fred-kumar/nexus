const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

// @route   POST /api/nova/chat
// @desc    Chat with Nova AI (proxies to Anthropic)
router.post('/chat', protect, async (req, res) => {
  try {
    const { chatId, message, history = [] } = req.body;

    // Verify user has access to this chat
    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.user.id });
    if (!chat) return res.status(403).json({ error: 'Access denied' });

    // Build messages array for Anthropic
    const messages = [
      ...history.slice(-20), // last 20 messages for context
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are Nova, an intelligent AI assistant built into the Nexus messaging platform.
You are warm, helpful, and conversational. Keep responses concise for chat context.
You can:
- Answer questions and provide information
- Help draft messages and emails
- Translate text between languages
- Summarize conversations
- Help with coding, writing, analysis
- Set reminders (tell user to use /remind command)
- Search web (indicate you would search)
Use markdown sparingly — plain text works best in chat.
Current user: ${req.user.name || 'User'}`,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.content?.[0]?.text || 'Sorry, I encountered an error. Please try again.';

    // Save AI message to DB
    const aiMsg = await Message.create({
      chat: chatId,
      sender: req.user.id, // stored under user but marked as AI
      type: 'ai',
      content: aiText,
      isAI: true,
      metadata: {
        model: data.model,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: aiMsg._id,
      lastActivity: new Date(),
    });

    // Emit via socket
    req.io.to(chatId).emit('new_message', {
      ...aiMsg.toObject(),
      sender: { _id: 'nova', name: 'Nova AI', username: 'nova', avatar: { url: '' } },
    });

    res.json({ success: true, message: aiMsg, text: aiText });
  } catch (err) {
    logger.error('Nova AI error:', err);
    res.status(500).json({ error: 'Nova AI is temporarily unavailable' });
  }
});

// @route   POST /api/nova/smart-replies
// @desc    Get smart reply suggestions
router.post('/smart-replies', protect, async (req, res) => {
  try {
    const { lastMessage, context } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Generate 3 short, natural smart reply suggestions for this message: "${lastMessage}"\nContext: ${context || 'casual chat'}\nReturn ONLY a JSON array of 3 strings, nothing else.`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    let suggestions;
    try {
      suggestions = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      suggestions = ['👍', 'Got it!', 'Sounds good!'];
    }

    res.json({ success: true, suggestions });
  } catch (err) {
    res.json({ success: true, suggestions: ['👍', 'Got it!', 'OK!'] });
  }
});

// @route   POST /api/nova/translate
// @desc    Translate a message
router.post('/translate', protect, async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Translate the following text to ${targetLang}. Return ONLY the translation:\n\n${text}`,
        }],
      }),
    });
    const data = await response.json();
    const translated = data.content?.[0]?.text || text;
    res.json({ success: true, translated, original: text });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;
