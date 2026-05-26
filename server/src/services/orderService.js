// src/services/orderService.js
'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getNextOrderNumber } = require('../utils/orderCounter');
const logger = require('../utils/logger');

const DATA_FILE = path.join(__dirname, '../../data/orders.json');

// ── In-memory store ──────────────────────────────────────────────────────────
// Orders live in memory for speed; JSON file is the persistence layer.
// On a larger system this would be replaced by a proper database.

/** @type {Order[]} */
let orders = [];

/**
 * @typedef {Object} Order
 * @property {string} orderNum       - Zero-padded 3-digit number e.g. "042"
 * @property {string} phone          - Customer WhatsApp number
 * @property {string[]} items        - Human-readable item strings e.g. ["2x Margherita"]
 * @property {string[]} messages     - Notes / flow replies
 * @property {'new'|'preparing'|'ready'} status
 * @property {string} time           - Locale time string of creation
 * @property {string} total          - Grand total as string e.g. "24.50"
 */

// ── Persistence ──────────────────────────────────────────────────────────────

function _ensureDataDir() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function load() {
  _ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    orders = JSON.parse(raw);
    logger.info(`Loaded ${orders.length} orders from disk`);
  } catch {
    orders = [];
  }
}

function save() {
  _ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
  } catch (err) {
    logger.error('Failed to persist orders', err);
  }
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/** Returns a shallow copy of all orders (prevents direct mutation). */
function getAll() {
  return [...orders];
}

/**
 * Find an order by its number.
 * @param {string} orderNum
 * @returns {Order|undefined}
 */
function findByNum(orderNum) {
  return orders.find((o) => o.orderNum === orderNum);
}

/**
 * Find the most recent active order for a given phone number.
 * "Active" = not yet ready.
 * @param {string} phone
 * @returns {Order|undefined}
 */
function findActiveByPhone(phone) {
  return orders.find((o) => o.phone === phone && o.status !== 'ready');
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Builds and stores a new order from a WhatsApp order message.
 * @param {string} phone
 * @param {{ product_retailer_id: string, quantity: number, item_price: number }[]} productItems
 * @param {string} [noteText]
 * @returns {Order}
 */
function createFromWhatsApp(phone, productItems, noteText = '') {
  const items = [];
  let grandTotal = 0;

  for (const item of productItems) {
    const menuEntry = config.menu[item.product_retailer_id];
    const name = menuEntry ? menuEntry.name : `Unknown (${item.product_retailer_id})`;
    items.push(`${item.quantity}x ${name}`);
    grandTotal += item.quantity * item.item_price;
  }

  /** @type {Order} */
  const order = {
    orderNum: getNextOrderNumber(),
    phone,
    items,
    messages: noteText ? [noteText] : [],
    status: 'new',
    time: new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }),
    total: grandTotal.toFixed(2),
  };

  orders.push(order);
  save();
  return order;
}

/**
 * Applies the WhatsApp Flow reply to an existing order.
 * Calculates extras, stores the summary line.
 * @param {string} orderNum
 * @param {object} flowData  - Parsed JSON from nfm_reply
 * @returns {Order|null}
 */
function applyFlowReply(orderNum, flowData) {
  const order = findByNum(orderNum);
  if (!order) return null;

  const selectedOptions = flowData.options || [];
  const extrasTotal = selectedOptions.reduce((sum, id) => {
    return sum + (config.extras[id]?.price ?? 0);
  }, 0);

  order.total = (parseFloat(order.total) + extrasTotal).toFixed(2);

  const cutting = flowData.couper === 'oui' ? 'Couper ✂️' : 'Entière 🍕';
  const extrasDisplay =
    selectedOptions.length > 0
      ? selectedOptions.map((id) => config.extras[id]?.label ?? id).join(', ')
      : 'Aucun';

  const summary = [
    `🕒 Heure: ${flowData.heure || 'N/A'}`,
    `✨ Extras: ${extrasDisplay}`,
    `🍕 ${cutting}`,
    flowData.note ? `📝 Note: ${flowData.note}` : null,
  ].filter(Boolean).join(' | ');

  order.messages.push(summary);
  save();
  return order;
}

/**
 * Updates the status of an order.
 * @param {string} orderNum
 * @param {'preparing'|'ready'} newStatus
 * @returns {Order|null}
 */
function updateStatus(orderNum, newStatus) {
  const order = findByNum(orderNum);
  if (!order) return null;

  order.status = newStatus;
  save();
  return order;
}

/**
 * Appends a text note to an order.
 * @param {Order} order
 * @param {string} text
 */
function addMessage(order, text) {
  order.messages.push(text);
  save();
}

/**
 * Clears all orders from memory and disk (called by daily cron).
 */
function reset() {
  orders = [];
  save();
  logger.info('Order store reset');
}

module.exports = {
  load,
  save,
  getAll,
  findByNum,
  findActiveByPhone,
  createFromWhatsApp,
  applyFlowReply,
  updateStatus,
  addMessage,
  reset,
};
