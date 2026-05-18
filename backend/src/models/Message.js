const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'voice', 'sticker', 'location', 'contact', 'poll', 'system', 'ai'],
    default: 'text',
  },
  content: { type: String, default: '' },
  media: {
    url: String,
    publicId: String,
    mimeType: String,
    size: Number,
    name: String,
    thumbnail: String,
    duration: Number, // for audio/video
    width: Number,
    height: Number,
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
    multipleChoice: { type: Boolean, default: false },
    expiresAt: Date,
  },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: [ReactionSchema],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
  deliveredTo: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now },
  }],
  edited: { type: Boolean, default: false },
  editedAt: Date,
  editHistory: [{ content: String, editedAt: Date }],
  deleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scheduledFor: Date,
  isScheduled: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isAI: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ 'readBy.user': 1 });
MessageSchema.index({ content: 'text' }); // Full-text search

module.exports = mongoose.model('Message', MessageSchema);
