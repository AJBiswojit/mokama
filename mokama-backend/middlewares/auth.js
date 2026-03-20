const express = require('express');
const router  = express.Router();
const {
  workerRegister, workerVerifyOTP, workerLogin, workerLoginVerify,
  employerRegister, employerVerifyOTP, employerLogin, employerLoginVerify,
  adminLogin, getCategories, getMe, refreshToken,
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

// OTP rate limit — 5 per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' }
});

// ── Worker ──
router.post('/worker/register',      otpLimiter, workerRegister);
router.post('/worker/verify-otp',    workerVerifyOTP);
router.post('/worker/login',         otpLimiter, workerLogin);
router.post('/worker/login/verify',  workerLoginVerify);

// ── Employer ──
router.post('/employer/register',     otpLimiter, employerRegister);
router.post('/employer/verify-otp',   employerVerifyOTP);
router.post('/employer/login',        otpLimiter, employerLogin);
router.post('/employer/login/verify', employerLoginVerify);

// ── Admin ──
router.post('/admin/login', adminLogin);

// ── Temporary admin reset — DELETE THIS ROUTE AFTER USE ──
router.post('/admin/reset-once', async (req, res) => {
  try {
    const { resetKey } = req.body;

    // Must match ADMIN_RESET_KEY env var — prevents unauthorized access
    if (!process.env.ADMIN_RESET_KEY || resetKey !== process.env.ADMIN_RESET_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid reset key' });
    }

    const Admin    = require('../models/Admin');
    const email    = process.env.ADMIN_EMAIL    || 'admin@mokama.in';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    await Admin.deleteOne({ email });

    await Admin.create({
      name:     'MoKama Admin',
      email,
      password,
      isActive: true,
    });

    res.json({
      success: true,
      message: `Admin reset successful. Email: ${email}. Now remove ADMIN_RESET_KEY from env.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Shared ──
router.get('/categories', getCategories);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);   // Refresh access token

module.exports = router;
