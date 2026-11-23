/** Amount validation, conversion and formatting. */
import { perUnit, RateTable } from './bnm';

export const MAX_AMOUNT = 1e12;

export type AmountResult = { ok: true; value: number } | { ok: false; error: string };

/** Accepts "100", "12.5", "12,50", "1 000". Rejects empty, zero, negative, letters, exponents. */
export function parseAmount(input: string): AmountResult {
  const s = input.replace(/[\s ]/g, '');
  if (s === '') return { ok: false, error: 'Введите сумму' };
  if (/^-\d/.test(s)) return { ok: false, error: 'Сумма должна быть больше нуля' };
  if (!/^\d+([.,]\d+)?$/.test(s)) return { ok: false, error: 'Сумма должна быть числом, например 100 или 12,50' };
  const value = Number(s.replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, error: 'Сумма должна быть числом' };
  if (value <= 0) return { ok: false, error: 'Сумма должна быть больше нуля' };
  if (value > MAX_AMOUNT) return { ok: false, error: 'Слишком большая сумма' };
  return { ok: true, value };
}

/** Units of `to` per one unit of `from`; null if a currency is missing. */
export function pairRate(table: RateTable, from: string, to: string): number | null {
  if (from === to) return 1;
  const f = table.rates[from];
  const t = table.rates[to];
  if (!f || !t) return null;
  return perUnit(f) / perUnit(t);
}

export function convert(amount: number, table: RateTable, from: string, to: string): number | null {
  const r = pairRate(table, from, to);
  return r === null ? null : amount * r;
}

/** "1 234,57" */
export function formatAmount(v: number, digits = 2): string {
  const [int, frac] = Math.abs(v).toFixed(digits).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (v < 0 ? '−' : '') + grouped + (frac ? ',' + frac : '');
}
