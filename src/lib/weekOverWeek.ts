import type { CostRow } from "./types";

const WINDOW_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export type WeekOverWeek = {
  currentUsd: number;
  previousUsd: number;
  changeUsd: number;
  changePct: number | null;
};

/**
 * Compare spend in the 7 calendar days ending on the latest date in `rows`
 * with the 7 calendar days immediately before that. The windows do not overlap.
 * Returns null when there are no rows.
 */
export function weekOverWeek(rows: CostRow[]): WeekOverWeek | null {
  if (rows.length === 0) return null;

  let latest = rows[0].date;
  for (const row of rows) {
    if (row.date > latest) latest = row.date;
  }

  const latestDay = utcDayNumber(latest);
  const currentStart = latestDay - (WINDOW_DAYS - 1);
  const previousEnd = currentStart - 1;
  const previousStart = previousEnd - (WINDOW_DAYS - 1);

  let currentUsd = 0;
  let previousUsd = 0;
  for (const row of rows) {
    const day = utcDayNumber(row.date);
    if (day >= currentStart && day <= latestDay) currentUsd += row.costUsd;
    else if (day >= previousStart && day <= previousEnd) previousUsd += row.costUsd;
  }

  const changeUsd = currentUsd - previousUsd;
  return {
    currentUsd,
    previousUsd,
    changeUsd,
    changePct: previousUsd === 0 ? null : changeUsd / previousUsd,
  };
}

function utcDayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}
