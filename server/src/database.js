// src/database.js
'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

const DB_PATH = path.join(__dirname, '../data/kds.sqlite');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS print_jobs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket     TEXT    NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'pending',
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
`);

logger.info(`SQLite database ready at ${DB_PATH}`);

module.exports = db;
