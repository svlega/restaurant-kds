// src/routes/orders.js
'use strict';

const express = require('express');
const router = express.Router();

const orderService = require('../services/orderService');
const ticketService = require('../services/ticketService');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

// GET /api/orders  — initial load for the dashboard
router.get('/', (_req, res) => {
  res.json(orderService.getAll());
});


// POST /api/orders/:orderNum/status  — update order status from KDS
router.post('/:orderNum/status', async (req, res) => {
  const { orderNum } = req.params;
  const { status } = req.body;

  const VALID_STATUSES = ['preparing', 'ready'];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const order = orderService.updateStatus(orderNum, status);
  if (!order) {
    return res.status(404).json({ error: `Order #${orderNum} not found` });
  }

  logger.info(`Order #${orderNum} → ${status}`);
  req.app.locals.io.emit('state-update', orderService.getAll());

  // Notify customer
  try {
    await whatsappService.sendStatusUpdate(order.phone, status);
  } catch (err) {
    logger.warn(`WhatsApp notification failed for order #${orderNum}`, err.message);
    // Don't fail the request if only the notification fails
  }

  res.json(order);
});

// POST /api/orders/:orderNum/reprint  — reprint a ticket from KDS
router.post('/:orderNum/reprint', async (req, res) => {
  const { orderNum } = req.params;
  const order = orderService.findByNum(orderNum);

  if (!order) {
    return res.status(404).json({ error: `Order #${orderNum} not found` });
  }

  try {
    const ticket = ticketService.buildTicket(order);
    await ticketService.queuePrintJob(ticket);
    logger.info(`Reprint queued for order #${orderNum}`);
    res.json({ queued: true });
  } catch (err) {
    logger.error(`Reprint failed for order #${orderNum}`, err);
    res.status(500).json({ error: 'Failed to queue reprint' });
  }
});

module.exports = router;
