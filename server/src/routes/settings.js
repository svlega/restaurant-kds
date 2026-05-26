'use strict';

const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

// GET /api/settings/hours
router.get('/hours', (_req, res) => {
  res.json(settingsService.getOpeningHours());
});

// PUT /api/settings/hours
router.put('/hours', (req, res) => {
  const hours = req.body;

  // Basic validation — must be an object with numeric day keys 0-6
  if (typeof hours !== 'object' || Array.isArray(hours)) {
    return res.status(400).json({ error: 'Invalid format' });
  }

  settingsService.setOpeningHours(hours);
  logger.info('Opening hours updated');
  res.json({ ok: true });
});

module.exports = router;
