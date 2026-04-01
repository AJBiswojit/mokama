require('dotenv').config();

// ─── Env validation — fail fast before anything loads ───
const REQUIRED_ENV = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'BREVO_API_KEY',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('   Check your .env file and restart.');
  process.exit(1);
}

const express       = require('express');
const http          = require('http');            // ← needed for Socket.IO
const { Server }    = require('socket.io');       // ← Socket.IO
const cors          = require('cors');
const mongoose      = require('mongoose');
const rateLimit     = require('express-rate-limit');
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss-clean');
const morgan        = require('morgan');
const compression   = require('compression');

const { initSocket } = require('./socket/socketHandler');

// Route imports
const authRoutes         = require('./routes/auth');
const workerRoutes       = require('./routes/worker');
const employerRoutes     = require('./routes/employer');
const jobRoutes          = require('./routes/job');
const adminRoutes        = require('./routes/admin');
const notificationRoutes = require('./routes/notification');

require('./cron/jobExpiry');
const dropStaleIndexes = require('./utils/fixIndexes');

const app = express();

// Trust Render/Railway proxy headers
app.set('trust proxy', 1);

// ─── Security middleware ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());

// ─── Global rate limit ───
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' }
}));

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MoKama API is running', timestamp: new Date() });
});

// ─── Routes ───
app.use('/api/auth',          authRoutes);
app.use('/api/worker',        workerRoutes);
app.use('/api/employer',      employerRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── 404 handler ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Create HTTP server and attach Socket.IO ───
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:      FRONTEND_URL,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

// ─── Initialize socket handler ───
initSocket(io);

// ─── Make io accessible in controllers ───
// Attach to app so controllers can access via req.app.get('io')
app.set('io', io);

// ─── MongoDB connection ───
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await dropStaleIndexes();

    server.listen(PORT, () => {
      console.log(`🚀 MoKama API running on port ${PORT}`);
    });

    // Seed admin after server starts
    const { seedAdmin } = require('./controllers/adminController');
    setTimeout(seedAdmin, 5000);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
