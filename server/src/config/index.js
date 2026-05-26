// src/config/index.js
// Single source of truth for all configuration.
// Throws on startup if required env vars are missing in production.

'use strict';

require('dotenv').config();

function requireEnv(key) {
  const value = process.env[key];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

module.exports = {
  // ── Server ──────────────────────────────────────────────
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  restaurantName: process.env.RESTAURANT_NAME || 'Restaurant',

  // ── WhatsApp / Meta ──────────────────────────────────────
  whatsapp: {
    token: requireEnv('FB_TOKEN'),
    phoneNumberId: requireEnv('PHONE_NUMBER_ID'),
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    flowId: requireEnv('COMMENTS_FLOW_ID'),
    verifyToken: requireEnv('WEBHOOK_VERIFY_TOKEN'),
  },

  // ── Admin Auth ───────────────────────────────────────────
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: requireEnv('ADMIN_PASSWORD'),
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },

  // ── Business Logic ────────────────────────────────────────
  openingHours: {
    0: [{ start: '18:30', end: '00:00' }],
    1: [{ start: '00:00', end: '14:00' }, { start: '18:30', end: '00:00' }],
    2: [{ start: '12:00', end: '14:00' }, { start: '18:30', end: '00:00' }],
    3: [{ start: '12:00', end: '14:00' }, { start: '18:30', end: '00:00' }],
    4: [{ start: '12:00', end: '14:00' }, { start: '18:30', end: '00:00' }],
    5: [{ start: '18:30', end: '00:30' }],
    6: [{ start: '12:00', end: '14:00' }, { start: '18:30', end: '00:30' }],
  },

  // ── Menu ──────────────────────────────────────────────────
  menu: {
    'vn55k3wn44': { name: 'Jalapeno cheddar'},
    'kpc0wv17d4': { name: 'Mozzarella sticks'},
    'hltx3w6058': { name: 'Chèvre miel'},
    'gd5zz86psu': { name: 'Paysanne'},
    '6m88hoayve': { name: 'Oriental'},
    'x61s3kq6df': { name: 'Cordial'},
    'rqjuddpptv': { name: 'Burrata'},
    'qqyawrvjyn': { name: 'Viking'},
    'di95xe51lr': { name: 'Latina épicée'},
    'c0inv4o4vv': { name: 'Hawaienne'},
    'ai6o0jpwrq': { name: 'Catalane'},
    'lrfbpsio28': { name: 'Pizza kebab'},
    '85he6y5fl7': { name: 'Bolognaise'},
    'z854xi7eey': { name: 'Savoyarde'},
    'prdyimbkqs': { name: 'Napolitaine'},
    'f6ftorejiu': { name: 'Thuna'},
    'qlrbh2w71m': { name: 'Mexicaine'},
    'uf9vji6osc': { name: 'Pesto'},
    'dctof6zfhh': { name: 'Tartufo'},
    'mwfj6cekvt': { name: 'Buffala' },
    'sl4vsz847c': { name: 'Margheritta'},
    'ljgn84xrpy': { name: 'Regina'},
    'on00y7xbnz': { name: 'Veggie'},
    'cxh8o4qc31': { name: '3 Formaggio' },
    'diuum7nxzn': { name: '4 Formage' },
    'gq0ipzcfya': { name: 'Scarmorza fumée'},
    'uccrb2cz76': { name: 'Vegan( sans formages'},
    '9twz9izzo5': { name: 'Carciofi'},
    'pmhs3soprr': { name: 'Pizza du mois'},
    'dl5gcugluh': { name: '4 Saisons'},
    '9gizozraoy': { name: 'Bressane'}
  },

  // ── Extras ────────────────────────────────────────────────
  extras: {
    cheese: { label: 'Supplément Fromage', price: 1.5 },
    chicken: { label: 'Supplément Poulet', price: 1.5 },
    egg: { label: 'Œuf', price: 1.5 },
    prosciutto: { label: 'Jambon Cru', price: 1.5 },
  },
};
