// src/printer.js
'use strict';

const net = require('net');
const iconv = require('iconv-lite');

// ── ESC/POS command bytes ────────────────────────────────────────────────────
const CMD = {
  RESET:          Buffer.from([0x1b, 0x40]),
  ENCODING:       Buffer.from([0x1b, 0x74, 0x02]), // CP850 — covers French chars
  BOLD_ON:        Buffer.from([0x1b, 0x45, 0x01]),
  BOLD_OFF:       Buffer.from([0x1b, 0x45, 0x00]),
  SIZE_NORMAL:    Buffer.from([0x1d, 0x21, 0x00]), // normal
  SIZE_TALL:      Buffer.from([0x1d, 0x21, 0x01]), // double height only (items)
  SIZE_BIG:       Buffer.from([0x1d, 0x21, 0x11]), // double width + height (order number)
  FEED:           Buffer.from([0x0a, 0x0a, 0x0a, 0x0a]),
  CUT:            Buffer.from([0x1d, 0x56, 0x00]),
  BUZZER:         Buffer.from([0x1b, 0x42, 0x03, 0x05]),
};

/**
 * Wraps a line of text to fit within the printer's column width.
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
function wrapLine(text, maxWidth) {
  if (text.length <= maxWidth) return [text];

  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + word).length > maxWidth) {
      if (current) lines.push(current.trimEnd());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }

  if (current.trim()) lines.push(current.trimEnd());
  return lines;
}

/**
 * Returns true if a line should be printed in bold.
 * Matches order number lines (#XXX) and item quantity lines (e.g. "2x Margherita").
 * @param {string} line
 * @returns {boolean}
 */
function isBold(line) {
  return line.includes('#') || /^\d+x\s/.test(line.trim());
}

/** Order number line e.g. "#001" */
function isOrderNum(line) {
  return /^#\d+/.test(line.trim());
}

/** Item quantity line e.g. "2x Margherita" */
function isItem(line) {
  return /^\d+x\s/.test(line.trim());
}

/**
 * Builds the full ESC/POS byte buffer for a ticket string.
 * @param {string} ticketText  - Plain-text receipt content
 * @param {number} lineWidth   - Printer column width
 * @returns {Buffer}
 */
function buildPrintBuffer(ticketText, lineWidth = 32) {
  const buffers = [CMD.RESET, CMD.ENCODING, CMD.BUZZER];

  const rawLines = ticketText.split('\n');
  for (const raw of rawLines) {
    // Double-width order number uses half the column width for wrapping
    const wrapWidth = isOrderNum(raw) ? Math.floor(lineWidth / 2) : lineWidth;
    const wrapped = wrapLine(raw, wrapWidth);
    for (const line of wrapped) {
      if (isOrderNum(line)) {
        buffers.push(CMD.SIZE_BIG, CMD.BOLD_ON);
        buffers.push(iconv.encode(line + '\n', 'cp850'));
        buffers.push(CMD.BOLD_OFF, CMD.SIZE_NORMAL);
      } else if (isItem(line)) {
        buffers.push(CMD.SIZE_TALL, CMD.BOLD_ON);
        buffers.push(iconv.encode(line + '\n', 'cp850'));
        buffers.push(CMD.BOLD_OFF, CMD.SIZE_NORMAL);
      } else {
        buffers.push(iconv.encode(line + '\n', 'cp850'));
      }
    }
  }

  buffers.push(CMD.FEED, CMD.CUT);
  return Buffer.concat(buffers);
}

/**
 * Connects to the thermal printer over TCP and sends the print buffer.
 * Resolves when data has been flushed; rejects on connection error.
 *
 * @param {string} ip
 * @param {number} port
 * @param {Buffer} payload
 * @returns {Promise<void>}
 */
function sendToSocket(ip, port, payload) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error(`Printer connection timeout (${ip}:${port})`));
    }, 10_000);

    client.connect(port, ip, () => {
      client.write(payload, () => {
        setTimeout(() => {
          clearTimeout(timeout);
          client.end();
          resolve();
        }, 500); // small flush delay
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * High-level print function: builds the ESC/POS buffer and sends it.
 *
 * @param {string} ticketText
 * @param {{ ip: string, port: number, lineWidth: number }} config
 * @returns {Promise<void>}
 */
async function printTicket(ticketText, config) {
  const payload = buildPrintBuffer(ticketText, config.lineWidth);
  await sendToSocket(config.ip, config.port, payload);
}

module.exports = { printTicket, buildPrintBuffer, wrapLine, isBold };
