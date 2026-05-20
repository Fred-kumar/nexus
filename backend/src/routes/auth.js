const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  register, login, refreshToken, logout,
  verifyOTP, forgotPassword, resetPassword, getMe,
} = require('../controllers/authController');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('username').trim().isLength({ min:3, max:30 }).withMessage('Username 3-30 chars').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: letters, numbers, _ only'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min:6 }).withMessage('Password min 6 chars'),
], register);

router.post('/login', [
  body('identifier').trim().notEmpty().withMessage('Identifier required'),
  body('password').notEmpty().withMessage('Password required'),
], login);

router.post('/refresh',          refreshToken);
router.post('/logout',  protect, logout);
router.post('/verify-otp', protect, verifyOTP);
router.post('/forgot-password', [body('email').isEmail()], forgotPassword);
router.put('/reset-password/:token', [body('password').isLength({ min:6 })], resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
