import { FetchFn } from '../src/lib/bnm';
import { KeyValueStore, MAX_BACK_DAYS, RatesRepository } from '../src/lib/repository';
import { seriesFor } from '../src/lib/series';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

const xml = (date: string, eur: number) =>
  `<ValCurs Date="${date}"><Valute><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>Euro</Name><Value>${eur}</Value></Valute>` +
  `<Valute><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Dollar</Name><Value>16</Value></Valute></ValCurs>`;

/** Fake BNM: `data` maps DD.MM.YYYY → EUR rate; `down` simulates no network. */
function fakeBnm(data: Record<string, number>, state = { down: false }) {
  const calls: string[] = [];
  const fn: FetchFn = async (url) => {
    const date = url.split('date=')[1];
    calls.push(date);
    if (state.down) throw new TypeError('Network request failed');
    if (!(date in data)) return { status: 404, text: async () => '' };
    return { status: 200, text: async () => xml(date, data[date]) };
  };
  return { fn, calls, state };
}

const NOW = () => new Date(2026, 10, 24, 15, 0); // 24.11.2026

describe('getLatest', () => {
  it('returns today and caches it', async () => {
    const store = new MemoryStore();
    const bnm = fakeBnm({ '24.11.2026': 20.1 });
    const r = await new RatesRepository(store, bnm.fn, NOW).getLatest();
    expect(r).toMatchObject({ fromCache: false, notice: undefined });
    expect(r.table.date).toBe('24.11.2026');
    expect(store.data.has('latest')).toBe(true);
  });

  it('falls back to the last published day and says so', async () => {
    const bnm = fakeBnm({ '21.11.2026': 20 });
    const r = await new RatesRepository(new MemoryStore(), bnm.fn, NOW).getLatest();
    expect(r.table.date).toBe('21.11.2026');
    expect(r.notice).toContain('не опубликован');
    expect(bnm.calls).toEqual(['24.11.2026', '23.11.2026', '22.11.2026', '21.11.2026']);
  });

  it('offline → cached table survives a "restart" (new repository, same storage)', async () => {
    const store = new MemoryStore();
    await new RatesRepository(store, fakeBnm({ '24.11.2026': 20.1 }).fn, NOW).getLatest();

    const offline = fakeBnm({}, { down: true });
    const r = await new RatesRepository(store, offline.fn, NOW).getLatest();
    expect(r.fromCache).toBe(true);
    expect(r.table.rates.EUR.value).toBe(20.1);
    expect(r.notice).toContain('Нет соединения');
    expect(r.savedAt).toBeDefined();
    expect(offline.calls).toHaveLength(1); // does not walk back dates while offline
  });

  it('offline without cache → clear error', async () => {
    await expect(new RatesRepository(new MemoryStore(), fakeBnm({}, { down: true }).fn, NOW).getLatest())
      .rejects.toThrow('нет сохранённых курсов');
  });

  it('no data at all → error after MAX_BACK_DAYS', async () => {
    const bnm = fakeBnm({});
    await expect(new RatesRepository(new MemoryStore(), bnm.fn, NOW).getLatest()).rejects.toThrow('не опубликовал');
    expect(bnm.calls).toHaveLength(MAX_BACK_DAYS + 1);
  });

  it('corrupted cache is treated as absent', async () => {
    const store = new MemoryStore();
    store.data.set('latest', '{broken');
    await expect(new RatesRepository(store, fakeBnm({}, { down: true }).fn, NOW).getLatest()).rejects.toThrow();
  });
});

describe('getHistory', () => {
  const week: Record<string, number> = {
    '18.11.2026': 20.0, '19.11.2026': 20.2, '20.11.2026': 20.1, '21.11.2026': 20.1,
    '22.11.2026': 20.1, '23.11.2026': 20.3, '24.11.2026': 20.4,
  };

  it('loads 7 days oldest-first and builds a pair series', async () => {
    const repo = new RatesRepository(new MemoryStore(), fakeBnm(week).fn, NOW);
    const h = await repo.getHistory(7);
    expect(h.days.map((d) => d.day)).toEqual(Object.keys(week));
    expect(h).toMatchObject({ missing: 0, offline: false });
    const s = seriesFor(h, 'EUR', 'MDL');
    expect(s.map((p) => p.value)).toEqual(Object.values(week));
    expect(seriesFor(h, 'EUR', 'USD')[0].value).toBeCloseTo(20 / 16);
  });

  it('reuses cached past days; only today is re-requested', async () => {
    const store = new MemoryStore();
    await new RatesRepository(store, fakeBnm(week).fn, NOW).getHistory(7);
    const second = fakeBnm(week);
    await new RatesRepository(store, second.fn, NOW).getHistory(7);
    expect(second.calls).toEqual(['24.11.2026']);
  });

  it('works offline from cache and reports it', async () => {
    const store = new MemoryStore();
    await new RatesRepository(store, fakeBnm(week).fn, NOW).getHistory(7);
    const h = await new RatesRepository(store, fakeBnm({}, { down: true }).fn, NOW).getHistory(7);
    expect(h.offline).toBe(true);
    expect(h.missing).toBe(0); // today was cached by the first run too
  });

  it('offline without cache → empty series, no exception', async () => {
    const h = await new RatesRepository(new MemoryStore(), fakeBnm({}, { down: true }).fn, NOW).getHistory(30);
    expect(h.days).toHaveLength(30);
    expect(h.missing).toBe(30);
    expect(seriesFor(h, 'EUR', 'MDL')).toEqual([]);
  });

  it('days without publication are skipped in the series', async () => {
    const h = await new RatesRepository(new MemoryStore(), fakeBnm({ '24.11.2026': 20 }).fn, NOW).getHistory(7);
    expect(h.missing).toBe(6);
    expect(h.offline).toBe(false);
    expect(seriesFor(h, 'EUR', 'MDL')).toHaveLength(1);
  });
});
