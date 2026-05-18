// ─── routes/auth.js ──────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  register, login, refreshToken, logout,
  verifyOTP, forgotPassword, resetPassword, getMe,
} = require('../controllers/authController');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username 3-30 chars'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
], register);

router.post('/login', [
  body('identifier').trim().notEmpty(),
  body('password').notEmpty(),
], login);

router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/verify-otp', protect, verifyOTP);
router.post('/forgot-password', [body('email').isEmail()], forgotPassword);
router.put('/reset-password/:token', [body('password').isLength({ min: 6 })], resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
