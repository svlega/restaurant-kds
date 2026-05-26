// src/services/openingHours.js
'use strict';

const settingsService = require('./settingsService');

/**
 * Converts "HH:MM" string to total minutes since midnight.
 * @param {string} timeStr
 * @returns {number}
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns the opening status for a given Date object.
 * Separated from Date.now() so it is fully unit-testable.
 *
 * @param {Date} now
 * @returns {'open' | 'closed'}
 */
function getOpeningStatus(now = new Date()) {
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = (settingsService.getOpeningHours()[day]) || [];

  for (const slot of slots) {
    const start = timeToMinutes(slot.start);
    let end = timeToMinutes(slot.end);
    let current = currentMinutes;

    // Handle slots that cross midnight (e.g. 18:30 → 00:30)
    if (end < start) {
      end += 24 * 60;
      if (current < start) current += 24 * 60;
    }

    if (current >= start && current <= end) return 'open';
  }

  return 'closed';
}

/**
 * Returns a human-readable schedule string for the closed message.
 * @returns {string}
 */
function getScheduleText() {
  return [
    'Dimanche : 18h30–00h00',
    'Lundi : 12h00–14h00 / 18h30–00h00',
    'Mardi – Jeudi : 12h00–14h00 / 18h30–00h00',
    'Vendredi : 12h00–14h00 /18h30–00h30',
    'Samedi : 12h00–14h00 / 18h30–00h30',
  ].join('\n');
}

module.exports = { getOpeningStatus, getScheduleText, timeToMinutes };
