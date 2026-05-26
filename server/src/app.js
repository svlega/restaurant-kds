// src/app.js
'use strict';

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const cron = require('node-cron');
const path = require('path');
const jwt = require('jsonwebtoken');

const config = require('./config');
const logger = require('./utils/logger');
const orderService = require('./services/orderService');
const { resetCounter } = require('./utils/orderCounter');
const db = require('./database');

const webhookRouter = require('./routes/webhook');
const ordersRouter = require('./routes/orders');
const printerRouter = require('./routes/printer');
const authRouter = require('./routes/auth');
const settingsRouter = require('./routes/settings');
const authMiddleware = require('./middleware/auth');

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.nodeEnv === 'development' ? /^http:\/\/localhost(:\d+)?$/ : config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

// Make io available to route handlers via app.locals
app.locals.io = io;

io.use((socket, next) => {
  try {
    jwt.verify(socket.handshake.auth.token, config.admin.jwtSecret);
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  logger.debug(`Dashboard connected: ${socket.id}`);
  socket.on('disconnect', () => logger.debug(`Dashboard disconnected: ${socket.id}`));
});

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  strictTransportSecurity: config.nodeEnv === 'production',
}));
const corsOrigin = config.nodeEnv === 'development'
  ? /^http:\/\/localhost(:\d+)?$/
  : config.frontendUrl;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Rate-limit the webhook to prevent abuse
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/webhook', webhookLimiter, webhookRouter);
app.use('/api/auth', authRouter);
app.use('/api/printer', printerRouter);

// Test order endpoint — no auth, non-production only (must be before authMiddleware)
if (config.nodeEnv !== 'production') {
  app.post('/api/orders/test', (req, res) => {
    const items = req.body.items || [
      { product_retailer_id: 'x61s3kq6df', quantity: 1, item_price: 12.5 },
      { product_retailer_id: 'sl4vsz847c', quantity: 2, item_price: 10.0 },
    ];
    const order = orderService.createFromWhatsApp(
      req.body.phone || '33600000000',
      items,
      req.body.note || 'Test order'
    );
    req.app.locals.io.emit('state-update', orderService.getAll());
    res.json(order);
  });
}

app.use('/api/orders', authMiddleware, ordersRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

// Health-check — used by Docker and uptime monitors
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Static dashboard (production only) ───────────────────────────────────────
if (config.nodeEnv !== 'development') {
  const publicDir = path.join(__dirname, '../../public');
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// ── Scheduled jobs ────────────────────────────────────────────────────────────

// Reset order list and counter every day at 05:00 (Paris time)
cron.schedule(
  '0 5 * * *',
  () => {
    logger.info('Daily reset: clearing orders and counter');
    orderService.reset();
    resetCounter();
    io.emit('orders-reset');
  },
  { timezone: 'Europe/Paris' }
);

// Rescue stuck print jobs every 30 seconds
setInterval(() => {
  db.prepare(
    `UPDATE print_jobs SET status = 'pending'
     WHERE status = 'printing' AND attempts < 5`
  ).run();
}, 30_000);

// Clean up completed jobs older than 2 days, every hour
setInterval(() => {
  db.prepare(
    `DELETE FROM print_jobs WHERE status = 'done'
     AND created_at < datetime('now', '-2 days')`
  ).run();
}, 3_600_000);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function start() {
  orderService.load();

  server.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} [${config.nodeEnv}]`);
  });
}

module.exports = { app, server, start };
