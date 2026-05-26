// src/index.js
'use strict';

require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { printTicket } = require('./printer');

// ── Config from environment ──────────────────────────────────────────────────
const SERVER_URL     = process.env.SERVER_URL     || 'http://localhost:3000';
const PRINTER_IP     = process.env.PRINTER_IP     || '192.168.1.203';
const PRINTER_PORT   = parseInt(process.env.PRINTER_PORT   || '9100', 10);
const POLL_INTERVAL  = parseInt(process.env.POLL_INTERVAL  || '3000', 10);
const HB_INTERVAL    = parseInt(process.env.HEARTBEAT_INTERVAL || '10000', 10);
const PRINTER_NAME   = process.env.PRINTER_NAME   || 'kitchen-1';
const LINE_WIDTH      = parseInt(process.env.PRINTER_LINE_WIDTH || '32', 10);

const LOG_FILE = path.join(__dirname, '../printer.log');

// ── Logger ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ── API helpers ───────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: SERVER_URL, timeout: 8000 });

async function fetchPendingJobs() {
  const { data } = await api.get('/api/printer/jobs');
  return data;
}

async function markPrinting(id) {
  await api.post(`/api/printer/jobs/${id}/printing`);
}

async function markDone(id) {
  await api.post(`/api/printer/jobs/${id}/done`);
}

async function sendHeartbeat() {
  await api.post('/api/printer/heartbeat', { name: PRINTER_NAME });
}

// ── Main polling loop ─────────────────────────────────────────────────────────
async function processPendingJobs() {
  let jobs;

  try {
    jobs = await fetchPendingJobs();
  } catch (err) {
    log(`Server unreachable: ${err.message}`);
    return;
  }

  if (!jobs || jobs.length === 0) return;

  log(`Found ${jobs.length} pending job(s)`);

  for (const job of jobs) {
    try {
      log(`Processing job ${job.id}`);

      // Mark as in-progress BEFORE printing to prevent duplicate prints
      // if the worker restarts mid-job
      await markPrinting(job.id);

      await printTicket(job.ticket, {
        ip: PRINTER_IP,
        port: PRINTER_PORT,
        lineWidth: LINE_WIDTH,
      });

      await markDone(job.id);
      log(`Job ${job.id} completed successfully`);

    } catch (err) {
      // Job remains in 'printing' state; the server retry cron will reset
      // it to 'pending' after 30 seconds (up to 5 attempts).
      log(`ERROR on job ${job.id}: ${err.message}`);
    }
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────
log(`Printer worker started — polling ${SERVER_URL} every ${POLL_INTERVAL}ms`);
log(`Target printer: ${PRINTER_IP}:${PRINTER_PORT} (${PRINTER_NAME})`);

// Poll for jobs
setInterval(processPendingJobs, POLL_INTERVAL);

// Heartbeat so the dashboard knows this printer is online
setInterval(async () => {
  try {
    await sendHeartbeat();
  } catch {
    // Silently ignore heartbeat failures — the dashboard will show offline
  }
}, HB_INTERVAL);

// Run immediately on start
processPendingJobs();
