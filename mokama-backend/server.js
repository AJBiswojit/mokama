require('dotenv').config();

// ─── Fix 2: .env validation — fail fast before anything loads ───
const REQUIRED_ENV = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('   Check your .env file and restart.');
  process.exit(1);
}

const express        = require('express');
const cors           = require('cors');
const mongoose       = require('mongoose');
const rateLimit      = require('express-rate-limit');
const helmet         = require('helmet');         // Fix 1a
const mongoSanitize  = require('express-mongo-sanitize'); // Fix 1b
const xss            = require('xss-clean');      // Fix 1c

// Route imports
const authRoutes         = require('./routes/auth');
const workerRoutes       = require('./routes/worker');
const employerRoutes     = require('./routes/employer');
const jobRoutes          = require('./routes/job');
const adminRoutes        = require('./routes/admin');
const notificationRoutes = require('./routes/notification');

// Cron jobs
require('./cron/jobExpiry');
const dropStaleIndexes = require('./utils/fixIndexes');

const app = express();

// ─── Fix 1: Security middleware (order matters) ───

// 1a. Helmet — sets secure HTTP headers (XSS protection, no sniff, HSTS, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow frontend assets
  contentSecurityPolicy: false, // disable CSP for now — enable when you go to prod with a proper config
}));

// 1b. CORS — after helmet
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));       // cap body size — prevents large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 1c. MongoDB injection sanitizer — strips $ and . from req.body, req.query, req.params
app.use(mongoSanitize());

// 1d. XSS sanitizer — strips HTML/script tags from all string inputs
app.use(xss());

// ─── Rate limiting ───
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', globalLimiter);

// Tighter limit specifically for OTP-sending routes
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,
  keyGenerator: (req) => (req.body?.mobile || req.ip), // per mobile number, not just IP
  message: { success: false, message: 'Too many OTP requests. Please wait 1 hour.' }
});
app.use('/api/auth/worker/register',      otpLimiter);
app.use('/api/auth/worker/login',         otpLimiter);
app.use('/api/auth/employer/register',    otpLimiter);
app.use('/api/auth/employer/login',       otpLimiter);

// ─── Routes ───
app.use('/api/auth',          authRoutes);
app.use('/api/worker',        workerRoutes);
app.use('/api/employer',      employerRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MoKama API is running', timestamp: new Date() });
});

// ─── 404 ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ───
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message,
  });
});

// ─── Connect DB and start ───
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await dropStaleIndexes(mongoose);
    app.listen(PORT, () => {
      console.log(`🚀 MoKama API running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
