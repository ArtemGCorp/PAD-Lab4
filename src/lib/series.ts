import { pairRate } from './money';
import { HistoryResult } from './repository';
import { Point } from './stats';

/** Builds the series for a currency pair; days without data are skipped. */
export function seriesFor(h: HistoryResult, from: string, to: string): Point[] {
  const out: Point[] = [];
  for (const d of h.days) {
    if (!d.table) continue;
    const r = pairRate(d.table, from, to);
    if (r !== null) out.push({ date: d.day, value: r });
  }
  return out;
}
