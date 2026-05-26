// src/services/ticketService.js
'use strict';

const db = require('../database');
const logger = require('../utils/logger');

/**
 * Formats a Date to a readable Paris-timezone string.
 * @param {Date} [date]
 * @returns {string}
 */
function formatDateTime(date = new Date()) {
  return date.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extracts structured ticket data from a raw Order object.
 * Parses the flow summary message for display on the ticket.
 *
 * @param {import('./orderService').Order} order
 * @returns {object} ticket
 */
function buildTicket(order) {
  const flowMsg = (order.messages || []).find((m) => m.includes('🕒 Heure:')) || '';

  const extract = (label) => {
    if (!flowMsg.includes(label)) return 'N/A';
    return flowMsg.split(label)[1].split(' |')[0].trim();
  };

  const items = Array.isArray(order.items) ? order.items.join('\n') : order.items || '';

  return {
    id: order.orderNum,
    phone: order.phone,
    items,
    extras: extract('Extras: '),
    preparation: extract('🍕 '),
    pickupTime: extract('Heure: '),
    note: extract('Note: '),
    total: order.total,
    createdAt: formatDateTime(),
  };
}

/**
 * Renders the kitchen receipt as a plain-text string.
 * Designed for 32-character-wide thermal printers.
 *
 * @param {object} ticket
 * @returns {string}
 */
function renderKitchenReceipt(ticket) {
  return [
    'Whatsapp Commande',
    `#${ticket.id}`,
    `TIME: ${ticket.createdAt}`,
    `TEL:  ${ticket.phone}`,
    '--------------------------------',
    ticket.items,
    '--------------------------------',
    `NOTE: ${ticket.note}`,
    '\n\n',
  ].join('\n');
}

/**
 * Queues a print job in the SQLite database.
 * The Raspberry Pi worker polls this table.
 *
 * @param {object} ticket
 * @returns {Promise<number>} the new job ID
 */
function queuePrintJob(ticket) {
  const receipt = renderKitchenReceipt(ticket);
  try {
    const result = db.prepare(
      `INSERT INTO print_jobs (ticket, status) VALUES (?, 'pending')`
    ).run(receipt);
    logger.info(`Print job queued: id=${result.lastInsertRowid} order=#${ticket.id}`);
    return Promise.resolve(result.lastInsertRowid);
  } catch (err) {
    logger.error('Failed to queue print job', err);
    return Promise.reject(err);
  }
}

module.exports = { buildTicket, renderKitchenReceipt, queuePrintJob, formatDateTime };
