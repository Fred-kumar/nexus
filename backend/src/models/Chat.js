const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['dm', 'group', 'channel', 'ai'],
    required: true,
  },
  name: { type: String, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    mutedUntil: { type: Date, default: null },
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    lastRead: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    archived: { type: Boolean, default: false },
  }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastActivity: { type: Date, default: Date.now },

  // Group/Channel settings
  settings: {
    isPublic: { type: Boolean, default: false },
    inviteLink: { type: String, unique: true, sparse: true },
    maxMembers: { type: Number, default: 200 },
    sendMessages: {
      type: String,
      enum: ['everyone', 'admins_only'],
      default: 'everyone',
    },
    slowMode: { type: Number, default: 0 }, // seconds between messages
    joinApproval: { type: Boolean, default: false },
  },

  pinnedMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  subscriberCount: { type: Number, default: 0 }, // for channels
  isActive: { type: Boolean, default: true },
  encryptionKey: { type: String, select: false }, // E2E placeholder
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Virtual: unread count per user (computed at query time)
ChatSchema.index({ 'participants.user': 1, lastActivity: -1 });
ChatSchema.index({ type: 1 });
ChatSchema.index({ 'settings.inviteLink': 1 });

module.exports = mongoose.model('Chat', ChatSchema);
