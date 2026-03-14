/**
 * Shared ISO week key utilities.
 * Extracted from lottery.service.ts for reuse across modules.
 */

/**
 * Get the ISO week key for a given date, e.g. "2026-W10"
 * ISO weeks run Monday–Sunday.
 */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get ISO week number from a date.
 */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Return weekKeys for the current week + next (count-1) weeks.
 */
export function getFutureWeekKeys(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() + i * 7 * 86400000);
    keys.push(getWeekKey(d));
  }
  return keys;
}

/**
 * Parse a weekKey ("2026-W12") → the Monday date of that week.
 */
export function weekKeyToMonday(weekKey: string): Date {
  const [yearStr, wStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // 1=Mon...7=Sun
  const mondayOfWeek1 = new Date(jan4.getTime() - (jan4DayOfWeek - 1) * 86400000);
  return new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
}

/**
 * Human-readable label for a weekKey relative to `now`.
 * - offset 0, Sunday → "今天 (M/D)"
 * - offset 0 → "这周末 (M/D-D)"
 * - offset 1 → "下周 (M/D-D)"
 * - offset 2 → "再下周 (M/D-D)"
 * - offset 3+ → "M/D那周"
 */
export function weekKeyToLabel(weekKey: string, now: Date = new Date()): string {
  const targetMonday = weekKeyToMonday(weekKey);
  const currentWeekKey = getWeekKey(now);
  const currentMonday = weekKeyToMonday(currentWeekKey);
  const offset = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (7 * 86400000));

  const sat = new Date(targetMonday.getTime() + 5 * 86400000);
  const sun = new Date(targetMonday.getTime() + 6 * 86400000);
  const satM = sat.getUTCMonth() + 1;
  const satD = sat.getUTCDate();
  const sunD = sun.getUTCDate();
  const dateRange = satM === (sun.getUTCMonth() + 1)
    ? `${satM}/${satD}-${sunD}`
    : `${satM}/${satD}-${sun.getUTCMonth() + 1}/${sunD}`;

  const isSunday = now.getDay() === 0;

  if (offset === 0 && isSunday) return `今天 (${now.getMonth() + 1}/${now.getDate()})`;
  if (offset === 0) return `这周末 (${dateRange})`;
  if (offset === 1) return `下周 (${dateRange})`;
  if (offset === 2) return `再下周 (${dateRange})`;
  return `${satM}/${satD}那周`;
}
