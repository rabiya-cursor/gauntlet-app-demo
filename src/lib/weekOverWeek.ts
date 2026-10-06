import type { CostRow } from "./types";

const WINDOW_DAYS = 7;

export type WeekOverWeek = {
  currentUsd: number;
  previousUsd: number;
  changeUsd: number;
  changePct: number | null;
};

/**
 * Compare spend in the 7 calendar days ending on the latest row date with the
 * 7 calendar days immediately before that. Windows are inclusive and do not overlap.
 * Missing dates count as zero. Returns null when there are no rows.
 */
export function weekOverWeek(rows: CostRow[]): WeekOverWeek | null {
  if (rows.length === 0) return null;

  let latest = rows[0].date;
  for (const row of rows) {
    if (row.date > latest) latest = row.date;
  }

  const currentEnd = utcDate(latest);
  const currentStart = addUtcDays(currentEnd, -(WINDOW_DAYS - 1));
  const previousEnd = addUtcDays(currentStart, -1);
  const previousStart = addUtcDays(previousEnd, -(WINDOW_DAYS - 1));

  const currentStartIso = isoDate(currentStart);
  const previousStartIso = isoDate(previousStart);
  const previousEndIso = isoDate(previousEnd);

  let currentUsd = 0;
  let previousUsd = 0;
  for (const row of rows) {
    if (row.date >= currentStartIso && row.date <= latest) currentUsd += row.costUsd;
    else if (row.date >= previousStartIso && row.date <= previousEndIso) previousUsd += row.costUsd;
  }

  const changeUsd = currentUsd - previousUsd;
  return {
    currentUsd,
    previousUsd,
    changeUsd,
    changePct: previousUsd === 0 ? null : changeUsd / previousUsd,
  };
}

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
