import { Page, Route } from '@playwright/test';

/** Fixed "today" for every test: 24.11.2026, 12:00 local time. */
export const TODAY = new Date(2026, 10, 24, 12, 0, 0);

const pad = (n: number) => String(n).padStart(2, '0');
export const fmt = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

export function daysBack(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

/** EUR/MDL for a day: grows by 0.01 per day, 20.00 thirty days ago. */
export function eurFor(date: string): number {
  for (let i = 0; i < 60; i++) {
    if (fmt(daysBack(i)) === date) return Math.round((20.3 - i * 0.01) * 10000) / 10000;
  }
  return 20;
}

export const USD = 16;

function xml(date: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ValCurs Date="${date}" name="Official exchange rate">
  <Valute ID="47"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>Euro</Name><Value>${eurFor(date)}</Value></Valute>
  <Valute ID="44"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>US Dollar</Name><Value>${USD}</Value></Valute>
  <Valute ID="35"><NumCode>946</NumCode><CharCode>RON</CharCode><Nominal>1</Nominal><Name>Romanian Leu</Name><Value>3.9</Value></Valute>
</ValCurs>`;
}

export interface MockOptions {
  /** No network at all: every request fails. */
  offline?: boolean;
  /** Dates (DD.MM.YYYY) for which BNM answers 404. */
  missing?: string[];
}

/** Serves fake BNM responses. Returns the list of requested dates. */
export async function mockBnm(page: Page, opts: MockOptions = {}): Promise<string[]> {
  const requested: string[] = [];
  await page.unroute('**/official_exchange_rates**');
  await page.route('**/official_exchange_rates**', (route: Route) => {
    const date = new URL(route.request().url()).searchParams.get('date') ?? '';
    requested.push(date);
    if (opts.offline) return route.abort('internetdisconnected');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/xml' };
    if (opts.missing?.includes(date)) return route.fulfill({ status: 404, headers, body: '' });
    return route.fulfill({ status: 200, headers, body: xml(date) });
  });
  return requested;
}

/** Opens the app with a fixed clock and the given BNM behaviour. */
export async function openApp(page: Page, opts: MockOptions = {}): Promise<string[]> {
  await page.clock.setFixedTime(TODAY);
  const requested = await mockBnm(page, opts);
  await page.goto('/');
  return requested;
}
