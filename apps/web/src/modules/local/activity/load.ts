export interface LoadEntry {
  /** Start of the activity, ms since epoch. */
  start: number;
  trimp: number;
}

const DAY_MS = 86_400_000;

/** Calendar day "YYYY-MM-DD" in the given time zone (default: the browser's). */
export function dayKey(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ms);
}

const dayIndex = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const keyOfIndex = (index: number) => new Date(index * DAY_MS).toISOString().slice(0, 10);

function loadByDay(entries: readonly LoadEntry[], timeZone?: string): Map<number, number> {
  const byDay = new Map<number, number>();
  for (const e of entries) {
    const day = dayIndex(dayKey(e.start, timeZone));
    byDay.set(day, (byDay.get(day) ?? 0) + e.trimp);
  }
  return byDay;
}

/** The 7 days ending with the day of the latest activity, oldest first. */
export function weekLoad(
  entries: readonly LoadEntry[],
  timeZone?: string,
): { day: string; trimp: number }[] {
  const byDay = loadByDay(entries, timeZone);
  if (byDay.size === 0) return [];
  const last = Math.max(...byDay.keys());
  return Array.from({ length: 7 }, (_, i) => {
    const day = last - 6 + i;
    return { day: keyOfIndex(day), trimp: byDay.get(day) ?? 0 };
  });
}

/** ACWR needs a chronic window of 4 weeks. */
export const ACWR_MIN_DAYS = 28;

export type AcwrResult =
  | { status: 'ok'; acute: number; chronic: number; ratio: number }
  | { status: 'insufficient'; spanDays: number };

/**
 * Acute:chronic workload ratio, rolling and "coupled" (Gabbett 2016, Br J Sports Med
 * 50(5):273–280): load of the last 7 days divided by the weekly average of the last 28 days,
 * both ending with the latest activity. A disputed indicator (Impellizzeri et al. 2020, IJSPP
 * 15:907–913, doi:10.1123/ijspp.2019-0864): shown for curiosity, not as a verdict.
 */
export function acwr(entries: readonly LoadEntry[], timeZone?: string): AcwrResult {
  const byDay = loadByDay(entries, timeZone);
  if (byDay.size === 0) return { status: 'insufficient', spanDays: 0 };
  const days = [...byDay.keys()];
  const last = Math.max(...days);
  const spanDays = last - Math.min(...days) + 1;
  if (spanDays < ACWR_MIN_DAYS) return { status: 'insufficient', spanDays };
  let acute = 0;
  let chronicSum = 0;
  for (const [day, load] of byDay) {
    if (day > last - 7) acute += load;
    if (day > last - 28) chronicSum += load;
  }
  const chronic = chronicSum / 4;
  return { status: 'ok', acute, chronic, ratio: chronic > 0 ? acute / chronic : 0 };
}
