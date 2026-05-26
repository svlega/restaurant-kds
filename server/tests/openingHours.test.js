// tests/openingHours.test.js
'use strict';

jest.mock('../src/services/settingsService', () => ({
  getOpeningHours: () => require('../src/config').openingHours,
}));

const { getOpeningStatus, timeToMinutes } = require('../src/services/openingHours');

describe('timeToMinutes', () => {
  test('converts "12:00" to 720', () => expect(timeToMinutes('12:00')).toBe(720));
  test('converts "00:00" to 0', () => expect(timeToMinutes('00:00')).toBe(0));
  test('converts "23:59" to 1439', () => expect(timeToMinutes('23:59')).toBe(1439));
  test('converts "18:30" to 1110', () => expect(timeToMinutes('18:30')).toBe(1110));
});

describe('getOpeningStatus', () => {
  // Helper: build a Date for a specific day/time (Paris local)
  const makeDate = (day, hour, minute) => {
    // day: 0=Sun … 6=Sat
    // We use a fixed week so day-of-week is predictable.
    // 2024-01-07 is a Sunday (day=0), 2024-01-08 is Monday, etc.
    const base = new Date('2024-01-07T00:00:00');
    base.setDate(base.getDate() + day);
    base.setHours(hour, minute, 0, 0);
    return base;
  };

  describe('Tuesday (day 2) — lunch 12:00–14:00 / dinner 18:30–00:00', () => {
    test('open at 12:30', () => {
      expect(getOpeningStatus(makeDate(2, 12, 30))).toBe('open');
    });

    test('closed at 11:59', () => {
      expect(getOpeningStatus(makeDate(2, 11, 59))).toBe('closed');
    });

    test('closed between services at 15:00', () => {
      expect(getOpeningStatus(makeDate(2, 15, 0))).toBe('closed');
    });

    test('open at 19:00 (dinner)', () => {
      expect(getOpeningStatus(makeDate(2, 19, 0))).toBe('open');
    });

    test('open at 13:50 (still within slot)', () => {
      expect(getOpeningStatus(makeDate(2, 13, 50))).toBe('open');
    });
  });

  describe('Friday (day 5) — dinner only 18:30–00:30', () => {
    test('closed at 12:00', () => {
      expect(getOpeningStatus(makeDate(5, 12, 0))).toBe('closed');
    });

    test('open at 20:00', () => {
      expect(getOpeningStatus(makeDate(5, 20, 0))).toBe('open');
    });

    test('open at 00:20 (still within slot past midnight)', () => {
      const d = makeDate(5, 0, 20);
      expect(getOpeningStatus(d)).toBe('open');
    });
  });

  describe('Sunday (day 0) — dinner only 18:30–00:00', () => {
    test('closed at 10:00', () => {
      expect(getOpeningStatus(makeDate(0, 10, 0))).toBe('closed');
    });

    test('open at 19:30', () => {
      expect(getOpeningStatus(makeDate(0, 19, 30))).toBe('open');
    });
  });
});
