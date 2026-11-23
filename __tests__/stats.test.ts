import { computeStats, Point } from '../src/lib/stats';

const pts = (...v: number[]): Point[] => v.map((value, i) => ({ date: `${String(i + 1).padStart(2, '0')}.11.2026`, value }));

describe('computeStats', () => {
  it('returns null for an empty data set', () => {
    expect(computeStats([])).toBeNull();
  });

  it('ignores non-finite values and returns null if nothing is left', () => {
    expect(computeStats(pts(NaN, Infinity))).toBeNull();
  });

  it('computes min, max, average and changes for growth', () => {
    const s = computeStats(pts(20, 19.5, 21, 20.5, 22))!;
    expect(s.count).toBe(5);
    expect(s.min).toEqual({ date: '02.11.2026', value: 19.5 });
    expect(s.max).toEqual({ date: '05.11.2026', value: 22 });
    expect(s.avg).toBeCloseTo(20.6);
    expect(s.absChange).toBeCloseTo(2);
    expect(s.pctChange).toBeCloseTo(10);
    expect(s.trend).toBe('up');
  });

  it('detects a fall', () => {
    const s = computeStats(pts(18.4, 18.3, 18.2))!;
    expect(s.absChange).toBeCloseTo(-0.2);
    expect(s.pctChange).toBeCloseTo((-0.2 / 18.4) * 100);
    expect(s.trend).toBe('down');
  });

  it('detects no change (including tiny noise below the threshold)', () => {
    expect(computeStats(pts(20, 21, 20))!.trend).toBe('flat');
    expect(computeStats(pts(20, 20.0001))!.trend).toBe('flat');
  });

  it('handles a single point', () => {
    const s = computeStats(pts(5))!;
    expect(s).toMatchObject({ count: 1, avg: 5, absChange: 0, pctChange: 0, trend: 'flat' });
  });

  it('does not divide by zero', () => {
    expect(computeStats(pts(0, 1))!.pctChange).toBe(0);
  });
});
