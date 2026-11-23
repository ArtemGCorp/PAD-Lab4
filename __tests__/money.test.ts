import { RateTable } from '../src/lib/bnm';
import { parseDay } from '../src/lib/dates';
import { convert, formatAmount, pairRate, parseAmount } from '../src/lib/money';

describe('parseAmount', () => {
  it.each([
    ['100', 100],
    [' 12.5 ', 12.5],
    ['12,50', 12.5],
    ['1 000', 1000],
    ['0,01', 0.01],
  ])('accepts %p', (input, value) => {
    expect(parseAmount(input)).toEqual({ ok: true, value });
  });

  it.each([
    ['', 'Введите сумму'],
    ['   ', 'Введите сумму'],
    ['0', 'больше нуля'],
    ['0,00', 'больше нуля'],
    ['-5', 'больше нуля'],
    ['abc', 'числом'],
    ['12abc', 'числом'],
    ['1e5', 'числом'],
    ['12,3,4', 'числом'],
    ['+5', 'числом'],
    ['.5', 'числом'],
    ['Infinity', 'числом'],
    ['1000000000001', 'большая'],
  ])('rejects %p', (input, message) => {
    const r = parseAmount(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(message);
  });
});

describe('convert / pairRate', () => {
  const table: RateTable = {
    date: '20.11.2026',
    rates: {
      MDL: { code: 'MDL', name: 'Леу', nominal: 1, value: 1 },
      EUR: { code: 'EUR', name: 'Euro', nominal: 1, value: 20 },
      USD: { code: 'USD', name: 'Dollar', nominal: 1, value: 16 },
      JPY: { code: 'JPY', name: 'Yen', nominal: 100, value: 12 },
    },
  };

  it('converts in both directions and across currencies', () => {
    expect(convert(100, table, 'EUR', 'MDL')).toBeCloseTo(2000);
    expect(convert(2000, table, 'MDL', 'EUR')).toBeCloseTo(100);
    expect(convert(100, table, 'EUR', 'USD')).toBeCloseTo(125);
    expect(convert(1000, table, 'JPY', 'MDL')).toBeCloseTo(120);
  });

  it('same currency returns the amount', () => {
    expect(convert(42, table, 'USD', 'USD')).toBe(42);
    expect(pairRate(table, 'GBP', 'GBP')).toBe(1);
  });

  it('unknown currency → null', () => {
    expect(pairRate(table, 'XXX', 'MDL')).toBeNull();
  });
});

describe('formatAmount', () => {
  it('groups thousands and uses a comma', () => {
    expect(formatAmount(1234567.891)).toBe('1 234 567,89');
    expect(formatAmount(0.5)).toBe('0,50');
    expect(formatAmount(20.12346, 4)).toBe('20,1235');
    expect(formatAmount(-3)).toBe('−3,00');
  });
});

describe('parseDay', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(parseDay('29.02.2024')?.getDate()).toBe(29);
    expect(parseDay('31.02.2026')).toBeNull();
    expect(parseDay('2026-01-01')).toBeNull();
  });
});
