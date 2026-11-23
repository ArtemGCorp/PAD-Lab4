/** Date helpers. All dates are local calendar days (time = 00:00). */

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() + n);
  return r;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "DD.MM.YYYY" — the format BNM uses. */
export function formatDay(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "DD.MM" for chart axes. */
export function formatShort(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

/** Parses "DD.MM.YYYY"; returns null for wrong format or non-existent days (31.02). */
export function parseDay(s: string): Date | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** The last n days ending with `end` (inclusive), oldest first. */
export function lastNDays(end: Date, n: number): Date[] {
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

export function sameDay(a: Date, b: Date): boolean {
  return formatDay(a) === formatDay(b);
}
