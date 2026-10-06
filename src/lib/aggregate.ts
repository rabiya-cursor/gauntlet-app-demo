import { ALL, UNTAGGED, type CostRow, type Filters } from "./types";

export type Summary = {
  totalUsd: number;
  topService: string | null;
  topServiceUsd: number;
  untaggedUsd: number;
  untaggedPct: number;
  dayCount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

export type Bar = {
  label: string;
  usd: number;
};

export function filterRows(rows: CostRow[], filters: Filters): CostRow[] {
  return rows.filter((row) => {
    if (filters.region !== ALL && row.region !== filters.region) return false;
    if (filters.team === UNTAGGED) return row.teamTag === "";
    if (filters.team !== ALL && row.teamTag !== filters.team) return false;
    return true;
  });
}

export function summarize(rows: CostRow[]): Summary {
  const totalUsd = sum(rows);
  const untaggedUsd = sum(rows.filter((row) => row.teamTag === ""));
  const byService = spendByService(rows);
  const top = byService[0];
  const dates = rows.map((row) => row.date).sort();

  return {
    totalUsd,
    topService: top?.label ?? null,
    topServiceUsd: top?.usd ?? 0,
    untaggedUsd,
    untaggedPct: totalUsd === 0 ? 0 : (untaggedUsd / totalUsd) * 100,
    dayCount: new Set(dates).size,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
  };
}

export function spendByService(rows: CostRow[]): Bar[] {
  return bars(rows, (row) => row.service);
}

export function spendByTeam(rows: CostRow[]): Bar[] {
  return bars(rows, (row) => (row.teamTag === "" ? UNTAGGED : row.teamTag));
}

export function listRegions(rows: CostRow[]): string[] {
  return [...new Set(rows.map((row) => row.region))].sort();
}

export function listTeams(rows: CostRow[]): string[] {
  return [
    ...new Set(rows.map((row) => (row.teamTag === "" ? UNTAGGED : row.teamTag))),
  ].sort();
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function bars(rows: CostRow[], labelOf: (row: CostRow) => string): Bar[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = labelOf(row);
    totals.set(label, (totals.get(label) ?? 0) + row.costUsd);
  }
  return [...totals.entries()]
    .map(([label, usd]) => ({ label, usd }))
    .sort((a, b) => b.usd - a.usd || a.label.localeCompare(b.label));
}

function sum(rows: CostRow[]): number {
  return rows.reduce((total, row) => total + row.costUsd, 0);
}
