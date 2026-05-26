// src/services/whatsappService.js
'use strict';

const axios = require('axios');
const config = require('../config');
const { getScheduleText } = require('./openingHours');
const logger = require('../utils/logger');
const orderService = require('./orderService');

const BASE_URL = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

const headers = {
  Authorization: `Bearer ${config.whatsapp.token}`,
  'Content-Type': 'application/json',
};

/**
 * Low-level helper — sends any WhatsApp message payload.
 * @param {object} payload
 */
async function send(payload) {
  try {
    await axios.post(BASE_URL, payload, { headers });
  } catch (err) {
    logger.error('WhatsApp send failed', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Sends a plain text message to a recipient.
 * @param {string} to   - Phone number with country code
 * @param {string} body - Message text
 */
async function sendText(to, body) {
  return send({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body },
  });
}

/**
 * Sends the initial welcome / how-to-order message.
 * @param {string} to
 */
async function sendWelcome(to) {
  return sendText(
    to,
    `Bienvenue chez ${config.restaurantName} ! 🍕\n\nPour commander, c'est très simple :\n1️⃣ Cliquez sur l'icône Boutique\n2️⃣ Choisissez vos pizzas\n3️⃣ Validez votre panier\n\nVous pourrez récupérer votre commande directement à la Pizzeria 🏪`
  );
}

/**
 * Sends the "we're closed" message with opening hours.
 * @param {string} to
 */
async function sendClosed(to) {
  return sendText(
    to,
    `🚫 *${config.restaurantName} est actuellement fermé*\n\n🕒 Horaires :\n\n${getScheduleText()}\n\n🙏 Merci de repasser pendant nos horaires d'ouverture.`
  );
}

/**
 * Sends the "closing soon" warning.
 * @param {string} to
 */
async function sendClosingSoon(to) {
  return sendText(
    to,
    '⚠️ *Nous fermons bientôt et n\'acceptons plus de nouvelles commandes.*\n\nMerci pour votre compréhension 🙏'
  );
}

/**
 * Sends the interactive Flow message to collect pickup time, extras, and notes.
 * @param {string} to
 * @param {string} orderNum
 */
async function sendOrderFlow(to, orderNum) {
  try {
    await send({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: { type: 'text', text: '🍕 Finaliser ma commande' },
        body: {
          text: '⚠️ *Votre commande n\'est pas encore confirmée.*\n\nAjoutez une note si besoin (heure de retrait, extras, allergies...) puis confirmez.\n\nSans confirmation, votre commande ne sera pas préparée.',
        },
        footer: { text: config.restaurantName },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: `order_${orderNum}`,
            flow_id: config.whatsapp.flowId,
            flow_cta: '✅ Confirmer ma commande',
            flow_action: 'navigate',
            flow_action_payload: { screen: 'PIZZERIA_DETAILS' },
          },
        },
      },
    });
    scheduleFlowReminder(to, orderNum);
  } catch (err) {
    logger.warn(`Flow message failed for order #${orderNum} (${to}): ${err.message}`);
  }
}

function scheduleFlowReminder(to, orderNum) {
  setTimeout(async () => {
    try {
      const order = orderService.findByNum(orderNum);
      if (!order) return;

      const flowCompleted = (order.messages || []).some((m) => m.includes('🕒 Heure:'));
      if (flowCompleted) return;

      logger.info(`Flow reminder sent for order #${orderNum}`);
      await sendText(
        to,
        '⏰ *Votre commande attend votre confirmation !*\n\nMerci de cliquer sur le bouton du message précédent pour finaliser votre commande.\n\nSans confirmation, elle ne sera pas préparée 🙏'
      );
    } catch (err) {
      logger.warn(`Flow reminder failed for order #${orderNum}: ${err.message}`);
    }
  }, 10 * 60 * 1000);
}

/**
 * Sends an order confirmation to the customer.
 * @param {string} to
 * @param {string} orderNum
 */
async function sendOrderConfirmation(to, orderNum) {
  return sendText(
    to,
    `✅ Votre commande n°${orderNum} a bien été prise en compte.\n\n⏱️ Elle sera prête dans environ 15 minutes.\n\nMerci et à bientôt ! 🍕`
  );
}

/**
 * Sends a status update notification.
 * @param {string} to
 * @param {'preparing'|'ready'} status
 */
async function sendStatusUpdate(to, status) {
  const messages = {
    preparing: '👨‍🍳 Nous préparons votre commande ! Elle sera prête dans environ 10 minutes.',
    ready: '✅ Votre commande est prête ! Vous pouvez venir la récupérer dès maintenant. À tout de suite ! 🍕',
  };
  const body = messages[status];
  if (body) return sendText(to, body);
}

module.exports = {
  sendText,
  sendWelcome,
  sendClosed,
  sendClosingSoon,
  sendOrderFlow,
  sendOrderConfirmation,
  sendStatusUpdate,
};
