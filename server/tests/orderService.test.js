// tests/orderService.test.js
'use strict';

jest.mock('../src/utils/orderCounter', () => ({
  getNextOrderNumber: jest.fn(() => '001'),
  resetCounter: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Prevent disk writes during tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '[]'),
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
}));

const orderService = require('../src/services/orderService');

beforeEach(() => {
  orderService.reset();
});

describe('createFromWhatsApp', () => {
  const phone = '33612345678';
  const products = [
    { product_retailer_id: 'sl4vsz847c', quantity: 2, item_price: 12.5 },
    { product_retailer_id: 'qqyawrvjyn', quantity: 1, item_price: 14.0 },
  ];

  test('creates an order with correct items and total', () => {
    const order = orderService.createFromWhatsApp(phone, products);
    expect(order.phone).toBe(phone);
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toContain('2x');
    expect(order.total).toBe('39.00');
    expect(order.status).toBe('new');
  });

  test('stores an optional note', () => {
    const order = orderService.createFromWhatsApp(phone, products, 'Sans piment');
    expect(order.messages).toContain('Sans piment');
  });

  test('falls back gracefully for unknown menu IDs', () => {
    const order = orderService.createFromWhatsApp(phone, [
      { product_retailer_id: 'unknown_id', quantity: 1, item_price: 10 },
    ]);
    expect(order.items[0]).toContain('Unknown');
  });
});

describe('applyFlowReply', () => {
  test('adds extras cost and stores summary', () => {
    orderService.createFromWhatsApp('33600000000', [
      { product_retailer_id: 'sl4vsz847c', quantity: 1, item_price: 12.5 },
    ]);

    const updated = orderService.applyFlowReply('001', {
      flow_token: 'order_001',
      heure: '20:00',
      options: ['cheese', 'egg'],
      couper: 'oui',
      note: 'Bien cuit',
    });

    expect(updated).not.toBeNull();
    // 12.50 + 1.50 (cheese) + 1.50 (egg) = 15.50
    expect(updated.total).toBe('15.50');
    expect(updated.messages.some((m) => m.includes('Heure: 20:00'))).toBe(true);
    expect(updated.messages.some((m) => m.includes('Couper'))).toBe(true);
  });

  test('returns null for unknown order number', () => {
    const result = orderService.applyFlowReply('999', { flow_token: 'order_999' });
    expect(result).toBeNull();
  });
});

describe('updateStatus', () => {
  test('transitions new → preparing → ready', () => {
    orderService.createFromWhatsApp('33600000001', [
      { product_retailer_id: 'sl4vsz847c', quantity: 1, item_price: 12.5 },
    ]);

    const preparing = orderService.updateStatus('001', 'preparing');
    expect(preparing.status).toBe('preparing');

    const ready = orderService.updateStatus('001', 'ready');
    expect(ready.status).toBe('ready');
  });

  test('findActiveByPhone excludes ready orders', () => {
    orderService.createFromWhatsApp('33600000002', [
      { product_retailer_id: 'sl4vsz847c', quantity: 1, item_price: 12.5 },
    ]);
    orderService.updateStatus('001', 'ready');

    const active = orderService.findActiveByPhone('33600000002');
    expect(active).toBeUndefined();
  });
});

describe('reset', () => {
  test('clears all orders', () => {
    orderService.createFromWhatsApp('33600000003', [
      { product_retailer_id: 'sl4vsz847c', quantity: 1, item_price: 12.5 },
    ]);
    orderService.reset();
    expect(orderService.getAll()).toHaveLength(0);
  });
});
