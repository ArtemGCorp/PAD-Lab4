/**
 * National Bank of Moldova official rates (XML).
 * GET https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=DD.MM.YYYY
 */
import { XMLParser } from 'fast-xml-parser';

import { formatDay, parseDay } from './dates';

export const SOURCE_NAME = 'Национальный банк Молдовы (bnm.md)';
export const BASE_URL = 'https://www.bnm.md/en/official_exchange_rates';

export interface Rate {
  code: string;
  name: string;
  nominal: number;
  /** MDL for `nominal` units. */
  value: number;
}

export interface RateTable {
  /** "DD.MM.YYYY" */
  date: string;
  rates: Record<string, Rate>;
}

/** The source has no rate for that date (404, empty body, no valid items). */
export class NoDataError extends Error {
  constructor(message = 'Курс на эту дату не опубликован') {
    super(message);
    this.name = 'NoDataError';
  }
}

/** Network failure, timeout, server error or unexpected response format. */
export class UnavailableError extends Error {
  constructor(message = 'Источник данных недоступен') {
    super(message);
    this.name = 'UnavailableError';
  }
}

export const MDL: Rate = { code: 'MDL', name: 'Леу', nominal: 1, value: 1 };

export function perUnit(r: Rate): number {
  return r.value / r.nominal;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  parseTagValue: false,
  isArray: (name) => name === 'Valute',
});

/** Parses BNM XML. Invalid <Valute> items are skipped. */
export function parseBnmXml(xml: string, requested: string): RateTable {
  if (!xml || xml.trim() === '') throw new NoDataError();
  const trimmed = xml.trim();
  if (!trimmed.startsWith('<')) throw new UnavailableError('Неожиданный формат ответа источника');

  let doc: any;
  try {
    doc = parser.parse(trimmed);
  } catch {
    throw new UnavailableError('Неожиданный формат ответа источника');
  }
  const root = doc?.ValCurs;
  if (root === undefined) throw new UnavailableError('Неожиданный формат ответа источника');

  const dateAttr = typeof root === 'object' ? String(root['@Date'] ?? '') : '';
  const date = parseDay(dateAttr) ? dateAttr : requested;

  const rates: Record<string, Rate> = {};
  const items: any[] = (typeof root === 'object' && root.Valute) || [];
  for (const v of items) {
    const code = String(v?.CharCode ?? '').trim().toUpperCase();
    const nominal = Number(String(v?.Nominal ?? '').trim());
    const value = Number(String(v?.Value ?? '').trim().replace(',', '.'));
    if (!/^[A-Z]{3}$/.test(code) || code === 'MDL') continue;
    if (!Number.isInteger(nominal) || nominal < 1) continue;
    if (!Number.isFinite(value) || value <= 0) continue;
    rates[code] = { code, name: String(v?.Name ?? code).trim(), nominal, value };
  }
  if (Object.keys(rates).length === 0) throw new NoDataError();
  rates.MDL = MDL;
  return { date, rates };
}

export type FetchFn = (url: string, init?: { signal?: AbortSignal }) => Promise<{
  status: number;
  text(): Promise<string>;
}>;

/** Downloads the table for one day. */
export async function fetchRateTable(day: Date, fetchFn: FetchFn = fetch, timeoutMs = 10000): Promise<RateTable> {
  const requested = formatDay(day);
  const url = `${BASE_URL}?get_xml=1&date=${requested}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchFn(url, { signal: ctrl.signal });
  } catch {
    throw new UnavailableError('Нет соединения с bnm.md');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) throw new NoDataError();
  if (res.status !== 200) throw new UnavailableError(`Источник ответил ошибкой HTTP ${res.status}`);
  let body: string;
  try {
    body = await res.text();
  } catch {
    throw new UnavailableError('Нет соединения с bnm.md');
  }
  return parseBnmXml(body, requested);
}
