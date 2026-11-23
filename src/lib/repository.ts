/**
 * Rate repository: network first, local cache as fallback.
 *
 * - Every successfully downloaded day is stored under `day:DD.MM.YYYY`.
 *   Past days never change, so the history screens reuse them without new
 *   requests and still work offline.
 * - The last successful "latest" table is stored under `latest` and survives
 *   app restarts.
 */
import { FetchFn, fetchRateTable, NoDataError, RateTable } from './bnm';
import { addDays, formatDay, lastNDays, startOfDay } from './dates';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const MAX_BACK_DAYS = 10;

export interface LatestResult {
  table: RateTable;
  /** Taken from the local cache because the network failed. */
  fromCache: boolean;
  /** When the cached table was downloaded (ISO string). */
  savedAt?: string;
  notice?: string;
}

export interface HistoryDay {
  day: string;
  table: RateTable | null;
}

export interface HistoryResult {
  days: HistoryDay[];
  /** Days with no data (not cached and network failed). */
  missing: number;
  /** At least one request failed because of the network. */
  offline: boolean;
}

interface CachedLatest {
  savedAt: string;
  table: RateTable;
}

export class RatesRepository {
  constructor(
    private store: KeyValueStore,
    private fetchFn: FetchFn = fetch,
    private now: () => Date = () => new Date(),
    private concurrency = 5,
  ) {}

  private async readJSON<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null; // corrupted cache is treated as absent
    }
  }

  private async writeJSON(key: string, value: unknown): Promise<void> {
    try {
      await this.store.setItem(key, JSON.stringify(value));
    } catch {
      // A full or broken storage must not break the app.
    }
  }

  /** Latest available table: today, else up to MAX_BACK_DAYS back, else cache. */
  async getLatest(): Promise<LatestResult> {
    const today = startOfDay(this.now());
    let lastError: unknown;
    for (let i = 0; i <= MAX_BACK_DAYS; i++) {
      const day = addDays(today, -i);
      try {
        const table = await fetchRateTable(day, this.fetchFn);
        const savedAt = this.now().toISOString();
        await this.writeJSON('latest', { savedAt, table } satisfies CachedLatest);
        await this.writeJSON(`day:${formatDay(day)}`, table);
        const notice = i > 0 ? `Курс на ${formatDay(today)} не опубликован, показан курс от ${table.date}.` : undefined;
        return { table, fromCache: false, notice };
      } catch (e) {
        lastError = e;
        if (!(e instanceof NoDataError)) break;
      }
    }

    const cached = await this.readJSON<CachedLatest>('latest');
    if (cached?.table?.rates) {
      return {
        table: cached.table,
        fromCache: true,
        savedAt: cached.savedAt,
        notice: `Нет соединения с bnm.md. Показан сохранённый курс от ${cached.table.date}.`,
      };
    }
    if (lastError instanceof NoDataError) {
      throw new Error(`Источник не опубликовал курс за последние ${MAX_BACK_DAYS + 1} дней.`);
    }
    throw new Error('Нет соединения с bnm.md и нет сохранённых курсов. Подключитесь к сети и обновите.');
  }

  /** Tables for the last `n` days (oldest first). Cached days are not re-downloaded. */
  async getHistory(n: number, onProgress?: (done: number, total: number) => void): Promise<HistoryResult> {
    const days = lastNDays(this.now(), n);
    const out: HistoryDay[] = days.map((d) => ({ day: formatDay(d), table: null }));
    let offline = false;
    let done = 0;

    const todayKey = formatDay(this.now());
    const work = days.map((d, idx) => async () => {
      const key = formatDay(d);
      const cached = await this.readJSON<RateTable>(`day:${key}`);
      // Today's table may still change (published ~13:00), so refresh it when online.
      if (cached && key !== todayKey) {
        out[idx].table = cached;
      } else if (!offline) {
        try {
          const t = await fetchRateTable(d, this.fetchFn);
          out[idx].table = t;
          await this.writeJSON(`day:${key}`, t);
        } catch (e) {
          if (!(e instanceof NoDataError)) offline = true;
          out[idx].table = cached;
        }
      } else {
        out[idx].table = cached;
      }
      onProgress?.(++done, days.length);
    });

    await runLimited(work, this.concurrency);
    return { days: out, missing: out.filter((d) => !d.table).length, offline };
  }
}

async function runLimited(tasks: (() => Promise<void>)[], limit: number): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}
