require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// ── Shared config ───────────────────────────────────────────────────────────
const { PORT, connectedUsers } = require('./config');
const { validateWalletAddress } = require('./middleware/verifyAdmin');
const { limiter } = require('./middleware/rateLimiters');
const { setIO: setNotificationIO } = require('./services/notificationService');
const { setIO: setNotificationControllerIO } = require('./controllers/notificationController');

// ── Shared CORS origins (single source of truth) ───────────────────────────
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://blockchain-evidence.onrender.com']).map(
        (url) => url.trim(),
      )
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// ── Express + HTTP + Socket.IO ──────────────────────────────────────────────
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Inject the io instance into services that need it
setNotificationIO(io);
setNotificationControllerIO(io);

// ── WebSocket connection handling ───────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (walletAddress) => {
    if (validateWalletAddress(walletAddress)) {
      connectedUsers.set(walletAddress, socket.id);
      socket.join(walletAddress);
      console.log(`User ${walletAddress} joined notifications`);
    }
  });

  socket.on('disconnect', () => {
    for (const [wallet, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(wallet);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// ── Middleware (ORDER IS CRITICAL!) ─────────────────────────────────────────

// 1. CORS MUST BE FIRST
app.use(cors({ origin: allowedOrigins, credentials: true }));

// 2. JSON / BODY PARSER
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. STATIC FILES — BEFORE API ROUTES
app.use(express.static(path.join(__dirname, 'public')));

// 4. General rate limiter
app.use('/api/', limiter);

// ── Routes ──────────────────────────────────────────────────────────────────
const registerRoutes = require('./routes');
registerRoutes(app);

// ── Error handling (ORDER: 404 handler BEFORE generic error handler) ───────

// 404 handler (must come BEFORE error handler — this is a regular middleware)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Generic error handler (must be LAST — Express requires 4-arg signature)
app.use((error, req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server (only when run directly, not when imported for testing) ───
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🔐 EVID-DGC API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔔 WebSocket notifications enabled`);
  });
}

module.exports = app;
