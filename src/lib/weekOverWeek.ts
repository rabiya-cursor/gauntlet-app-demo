import type { CostRow } from "./types";

export type WeekOverWeek = {
  currentUsd: number;
  previousUsd: number;
  changeUsd: number;
  /** Fractional change versus the previous window. Null when that window is $0. */
  changePct: number | null;
};

function shiftIsoDate(iso: string, deltaDays: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return date.toISOString().slice(0, 10);
}

/**
 * Compare spend in the 7 calendar days ending on the latest row date
 * with the 7 calendar days immediately before that. The windows do not overlap.
 * Returns null when there are no rows.
 */
export function weekOverWeek(rows: CostRow[]): WeekOverWeek | null {
  if (rows.length === 0) return null;

  let latest = rows[0].date;
  for (const row of rows) {
    if (row.date > latest) latest = row.date;
  }

  const currentStart = shiftIsoDate(latest, -6);
  const previousEnd = shiftIsoDate(latest, -7);
  const previousStart = shiftIsoDate(latest, -13);

  let currentUsd = 0;
  let previousUsd = 0;
  for (const row of rows) {
    if (row.date >= currentStart && row.date <= latest) {
      currentUsd += row.costUsd;
    } else if (row.date >= previousStart && row.date <= previousEnd) {
      previousUsd += row.costUsd;
    }
  }

  const changeUsd = currentUsd - previousUsd;
  return {
    currentUsd,
    previousUsd,
    changeUsd,
    changePct: previousUsd === 0 ? null : changeUsd / currentUsd,
  };
}
