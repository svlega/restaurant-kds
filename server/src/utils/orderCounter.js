// src/utils/orderCounter.js
'use strict';

const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '../../data/counter.json');

/**
 * Reads the current counter from disk.
 * Defaults to 1 if the file doesn't exist.
 */
function readCounter() {
  try {
    return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
  } catch {
    return 1;
  }
}

/**
 * Persists the counter value to disk.
 * @param {number} value
 */
function writeCounter(value) {
  fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true });
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(value));
}

/**
 * Returns a zero-padded 3-digit order number and advances the counter.
 * Wraps from 999 back to 1 (daily reset handles this too).
 * @returns {string} e.g. "042"
 */
function getNextOrderNumber() {
  const current = readCounter();
  const label = current.toString().padStart(3, '0');
  writeCounter(current >= 999 ? 1 : current + 1);
  return label;
}

/**
 * Resets the counter back to 1.
 * Called by the daily cron job.
 */
function resetCounter() {
  writeCounter(1);
}

module.exports = { getNextOrderNumber, resetCounter, readCounter };
