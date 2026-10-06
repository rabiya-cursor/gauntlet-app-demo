import type { CostRow } from "./types";

export const WINDOW_DAYS = 7;

export type WeekOverWeek = {
  /** Spend in the 7 calendar days ending on the latest date in the rows (inclusive). */
  currentUsd: number;
  /** Spend in the 7 calendar days before that window. */
  previousUsd: number;
  changeUsd: number;
  /** Fraction (0.12 means +12%), or null when previousUsd is 0. */
  changePct: number | null;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

/** Shift an ISO date (YYYY-MM-DD) by a number of calendar days, in UTC. */
export function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Compare the last 7 days of spend with the 7 days before that, for whatever rows are passed in. */
export function weekOverWeek(rows: CostRow[]): WeekOverWeek | null {
  if (rows.length === 0) return null;

  const currentEnd = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), rows[0].date);
  const currentStart = shiftDay(currentEnd, -(WINDOW_DAYS - 1));
  const previousEnd = shiftDay(currentStart, -1);
  const previousStart = shiftDay(previousEnd, -(WINDOW_DAYS - 1));

  let currentUsd = 0;
  let previousUsd = 0;
  for (const row of rows) {
    if (row.date >= currentStart && row.date <= currentEnd) currentUsd += row.costUsd;
    else if (row.date >= previousStart && row.date <= previousEnd) previousUsd += row.costUsd;
  }

  const changeUsd = currentUsd - previousUsd;
  const changePct = previousUsd === 0 ? null : changeUsd / currentUsd;

  return { currentUsd, previousUsd, changeUsd, changePct, currentStart, currentEnd, previousStart, previousEnd };
}
