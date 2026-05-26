// tests/ticketService.test.js
'use strict';

jest.mock('../src/database', () => ({
  prepare: jest.fn(() => ({ run: jest.fn(() => ({ lastID: 1 })), all: jest.fn(() => []) })),
  run: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn(),
}));

const { buildTicket, renderKitchenReceipt } = require('../src/services/ticketService');

const mockOrder = {
  orderNum: '042',
  phone: '33612345678',
  items: ['2x Margherita', '1x Viking'],
  messages: [
    '🕒 Heure: 20:00 | ✨ Extras: Supplément Fromage | 🍕 Couper ✂️ | 📝 Note: Bien cuit',
  ],
  total: '39.00',
  status: 'new',
  time: '19:45:00',
};

describe('buildTicket', () => {
  test('extracts all fields from flow message', () => {
    const ticket = buildTicket(mockOrder);
    expect(ticket.id).toBe('042');
    expect(ticket.pickupTime).toBe('20:00');
    expect(ticket.extras).toBe('Supplément Fromage');
    expect(ticket.note).toBe('Bien cuit');
    expect(ticket.total).toBe('39.00');
  });

  test('falls back to N/A when no flow message present', () => {
    const order = { ...mockOrder, messages: [] };
    const ticket = buildTicket(order);
    expect(ticket.pickupTime).toBe('N/A');
    expect(ticket.note).toBe('N/A');
  });

  test('joins array items into newline-separated string', () => {
    const ticket = buildTicket(mockOrder);
    expect(ticket.items).toContain('\n');
    expect(ticket.items).toContain('2x Margherita');
  });
});

describe('renderKitchenReceipt', () => {
  test('includes order ID and phone', () => {
    const ticket = buildTicket(mockOrder);
    const receipt = renderKitchenReceipt(ticket);
    expect(receipt).toContain('#042');
    expect(receipt).toContain('33612345678');
  });

  test('includes all items', () => {
    const ticket = buildTicket(mockOrder);
    const receipt = renderKitchenReceipt(ticket);
    expect(receipt).toContain('2x Margherita');
    expect(receipt).toContain('1x Viking');
  });
});
