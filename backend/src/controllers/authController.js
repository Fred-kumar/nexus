const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');
const { cacheDel } = require('../config/redis');
const logger = require('../utils/logger');

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, username, email, password, phone } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const user = await User.create({ name, username, email, password, phone });

    // Send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user._otp = otp;
    user._otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: email,
        subject: 'Verify your Nexus account',
        html: `<h2>Welcome to Nexus!</h2><p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (e) {
      logger.warn('Email send failed:', e.message);
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Account created. Check email for verification code.',
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// @desc    Login
// @route   POST /api/auth/login
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    user.status = 'online';
    user.lastSeen = new Date();
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshTokens = user.refreshTokens.slice(-5); // keep last 5
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.find((t) => t.token === token)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save({ validateBeforeSave: false });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
      user.status = 'offline';
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout error' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user._otp !== otp || user._otpExpiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    user.isVerified = true;
    user._otp = undefined;
    user._otpExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Account verified!' });
  } catch (err) {
    res.status(500).json({ error: 'Verification error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: true, message: 'If email exists, reset link sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user._resetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user._resetExpiry = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Nexus Password Reset',
      html: `<h2>Reset your password</h2><p><a href="${resetUrl}">Click here to reset</a></p><p>Link expires in 1 hour.</p>`,
    });

    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Could not send reset email' });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      _resetToken: hashedToken,
      _resetExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    user.password = req.body.password;
    user._resetToken = undefined;
    user._resetExpiry = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('contacts', 'name username avatar status lastSeen');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user' });
  }
};

module.exports = { register, login, refreshToken, logout, verifyOTP, forgotPassword, resetPassword, getMe };
