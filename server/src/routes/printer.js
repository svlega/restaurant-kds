// src/routes/printer.js
'use strict';

const express = require('express');
const router = express.Router();

const db = require('../database');
const logger = require('../utils/logger');

// In-memory printer heartbeat registry
// key: printer name, value: last-seen timestamp (ms)
const printerRegistry = {};

// GET /api/printer/jobs  — Pi polls this for pending work
router.get('/jobs', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, ticket FROM print_jobs
       WHERE status = 'pending'
       ORDER BY id ASC
       LIMIT 5`
    )
    .all();

  res.json(rows);
});

// POST /api/printer/jobs/:id/printing  — Pi marks job as in-progress
router.post('/jobs/:id/printing', (req, res) => {
  const { id } = req.params;

  db.prepare(
    `UPDATE print_jobs
     SET status = 'printing', attempts = attempts + 1
     WHERE id = ?`
  ).run(id);

  res.sendStatus(200);
});

// POST /api/printer/jobs/:id/done  — Pi marks job as complete
router.post('/jobs/:id/done', (req, res) => {
  const { id } = req.params;

  db.prepare(`UPDATE print_jobs SET status = 'done' WHERE id = ?`).run(id);

  logger.info(`Print job ${id} completed`);
  res.sendStatus(200);
});

// GET /api/printer/queue  — debug endpoint to inspect all jobs
router.get('/queue', (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM print_jobs ORDER BY id DESC LIMIT 50`)
    .all();
  res.json(rows);
});

// POST /api/printer/heartbeat  — Pi sends this every 10s to show it's alive
router.post('/heartbeat', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  printerRegistry[name] = Date.now();
  res.sendStatus(200);
});

// GET /api/printer/status  — dashboard polls this to show online/offline indicator
router.get('/status', (req, res) => {
  const now = Date.now();
  const TIMEOUT_MS = 20_000;

  const statuses = Object.entries(printerRegistry).map(([name, lastSeen]) => ({
    name,
    online: now - lastSeen < TIMEOUT_MS,
    lastSeen: new Date(lastSeen).toISOString(),
  }));

  res.json(statuses);
});

module.exports = router;
