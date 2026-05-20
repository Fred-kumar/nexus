const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cacheGet, cacheSet } = require('../config/redis');

const protect = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.cookies?.token;

    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try cache first
    let user = await cacheGet(`user:${decoded.id}`);
    if (!user) {
      user = await User.findById(decoded.id).select('-password -refreshTokens');
      if (!user) return res.status(401).json({ error: 'User not found' });
      await cacheSet(`user:${decoded.id}`, user.toObject(), 300);
    }

    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {}
  next();
};

module.exports = { protect, authorize, optionalAuth };
