const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  bio: { type: String, maxlength: 150, default: '' },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline',
  },
  lastSeen: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      auth: String,
      p256dh: String,
    },
  }],
  settings: {
    notifications: {
      messages: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
      groups: { type: Boolean, default: true },
    },
    privacy: {
      lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      readReceipts: { type: Boolean, default: true },
    },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    language: { type: String, default: 'en' },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ status: 1 });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Generate JWT
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, username: this.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '90d' }
  );
};

// Public profile (exclude sensitive fields)
UserSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    status: this.status,
    lastSeen: this.lastSeen,
    isVerified: this.isVerified,
  };
};

module.exports = mongoose.model('User', UserSchema);
