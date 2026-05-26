'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

function load() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (err) {
    // File missing or corrupt — fall back to config defaults
    logger.warn(`Failed to load settings: ${err.message}`);
  }
  return { openingHours: config.openingHours };
}

function save(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getOpeningHours() {
  return load().openingHours;
}

function setOpeningHours(hours) {
  const settings = load();
  settings.openingHours = hours;
  save(settings);
}

module.exports = { getOpeningHours, setOpeningHours };
