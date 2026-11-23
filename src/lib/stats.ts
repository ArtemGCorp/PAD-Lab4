/** Statistics for the comparison screens. */

export interface Point {
  /** "DD.MM.YYYY" */
  date: string;
  value: number;
}

export type Trend = 'up' | 'down' | 'flat';

export interface Stats {
  count: number;
  min: Point;
  max: Point;
  avg: number;
  first: Point;
  last: Point;
  absChange: number;
  /** Percent, e.g. 1.5 means +1.5 %. */
  pctChange: number;
  trend: Trend;
}

/** Changes smaller than this (in %) are treated as "no change". */
export const FLAT_THRESHOLD_PCT = 0.01;

/** Returns null for an empty series. Points must be ordered oldest → newest. */
export function computeStats(points: Point[]): Stats | null {
  const valid = points.filter((p) => Number.isFinite(p.value));
  if (valid.length === 0) return null;

  let min = valid[0];
  let max = valid[0];
  let sum = 0;
  for (const p of valid) {
    if (p.value < min.value) min = p;
    if (p.value > max.value) max = p;
    sum += p.value;
  }
  const first = valid[0];
  const last = valid[valid.length - 1];
  const absChange = last.value - first.value;
  const pctChange = first.value === 0 ? 0 : (absChange / first.value) * 100;
  const trend: Trend =
    Math.abs(pctChange) < FLAT_THRESHOLD_PCT ? 'flat' : absChange > 0 ? 'up' : 'down';

  return { count: valid.length, min, max, avg: sum / valid.length, first, last, absChange, pctChange, trend };
}

export const TREND_LABEL: Record<Trend, string> = {
  up: 'Рост',
  down: 'Падение',
  flat: 'Без изменений',
};
