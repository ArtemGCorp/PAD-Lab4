/**
 * @jest-environment node
 *
 * Hits the real bnm.md. Skipped unless LAB4_LIVE=1:
 *   LAB4_LIVE=1 npx jest live
 */
import https from 'node:https';

import { FetchFn } from '../src/lib/bnm';
import { KeyValueStore, RatesRepository } from '../src/lib/repository';

// jest-expo replaces global fetch with a mock even in the node environment.
const nodeFetch: FetchFn = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text: async () => body }));
      })
      .on('error', reject);
  });
import { seriesFor } from '../src/lib/series';
import { computeStats } from '../src/lib/stats';

const live = process.env.LAB4_LIVE === '1' ? describe : describe.skip;

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

live('real BNM', () => {
  it('loads latest and 30 days of history', async () => {
    const repo = new RatesRepository(new MemoryStore(), nodeFetch);
    const latest = await repo.getLatest();
    expect(latest.table.rates.EUR.value).toBeGreaterThan(0);

    const h = await repo.getHistory(30);
    const s = computeStats(seriesFor(h, 'EUR', 'MDL'))!;
    console.log(`EUR/MDL 30d: min ${s.min.value} max ${s.max.value} avg ${s.avg.toFixed(4)} ` +
      `change ${s.pctChange.toFixed(2)}% ${s.trend}, missing ${h.missing}`);
    expect(s.count).toBeGreaterThanOrEqual(20);
  }, 60000);
});
