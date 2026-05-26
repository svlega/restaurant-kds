// src/routes/webhook.js
'use strict';

const express = require('express');
const router = express.Router();

const config = require('../config');
const orderService = require('../services/orderService');
const whatsappService = require('../services/whatsappService');
const ticketService = require('../services/ticketService');
const { getOpeningStatus } = require('../services/openingHours');
const logger = require('../utils/logger');

// ── GET /webhook  (Meta verification) ────────────────────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// ── POST /webhook  (Incoming messages) ───────────────────────────────────────
router.post('/', async (req, res) => {
  // Acknowledge immediately — Meta requires a fast 200
  res.sendStatus(200);

  const val = req.body?.entry?.[0]?.changes?.[0]?.value;

  // Ignore status updates and non-message events
  if (!val?.messages?.length) return;

  const message = val.messages[0];
  const from = message.from;

  const io = req.app.locals.io;

  try {
    if (message.type === 'order') {
      await handleOrderMessage(io, from, message);
    } else if (message.type === 'text') {
      await handleTextMessage(io, from, message);
    } else if (message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
      await handleFlowReply(io, from, message);
    }
  } catch (err) {
    logger.error(`Webhook handler error for ${from}`, err);
  }
});

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleOrderMessage(io, from, message) {
  const status = getOpeningStatus();

  if (status === 'closed') {
    logger.info(`Order rejected — restaurant closed (from: ${from})`);
    await whatsappService.sendClosed(from);
    return;
  }

const { product_items, text: noteText } = message.order;
  const order = orderService.createFromWhatsApp(from, product_items, noteText);

  logger.info(`New order #${order.orderNum} from ${from} — ${order.items.length} item(s)`);

  // Emit to dashboard via Socket.io (injected via app.locals)
  io.emit('state-update', orderService.getAll());

  await whatsappService.sendOrderFlow(from, order.orderNum);
}

async function handleTextMessage(io, from, message) {
  const activeOrder = orderService.findActiveByPhone(from);

  if (activeOrder) {
    orderService.addMessage(activeOrder, message.text.body);
    io.emit('state-update', orderService.getAll());
    logger.debug(`Note appended to order #${activeOrder.orderNum}`);
  }

  await whatsappService.sendWelcome(from);
}

async function handleFlowReply(io, from, message) {
  let responseData;

  try {
    responseData = JSON.parse(message.interactive.nfm_reply.response_json);
  } catch {
    logger.error('Failed to parse nfm_reply JSON', message.interactive.nfm_reply);
    return;
  }

  const flowToken = responseData.flow_token;
  if (!flowToken) {
    logger.error('Missing flow_token in nfm_reply', responseData);
    return;
  }

  const orderNum = flowToken.split('_')[1];
  const order = orderService.applyFlowReply(orderNum, responseData);

  if (!order) {
    logger.warn(`Flow reply for unknown order #${orderNum}`);
    return;
  }

  logger.info(`Flow reply processed for order #${orderNum}`);
  io.emit('state-update', orderService.getAll());

  // Print and confirm
  const ticket = ticketService.buildTicket(order);
  await ticketService.queuePrintJob(ticket);
  await whatsappService.sendOrderConfirmation(from, order.orderNum);
}

module.exports = router;
