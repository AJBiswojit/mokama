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

// ── Shared ──
router.get('/categories', getCategories);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);   // Refresh access token

module.exports = router;
