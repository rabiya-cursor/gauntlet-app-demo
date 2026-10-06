import type { CostRow, Filters, SpendSlice, Summary } from "./types";
import { UNTAGGED } from "./types";

export function applyFilters(rows: CostRow[], filters: Filters): CostRow[] {
  return rows.filter((row) => {
    if (filters.region && row.region !== filters.region) return false;
    if (filters.team === UNTAGGED) return row.teamTag === "";
    if (filters.team && row.teamTag !== filters.team) return false;
    return true;
  });
}

export function summarize(rows: CostRow[]): Summary {
  const totalUsd = sumCosts(rows);
  const byService = spendByService(rows);
  const top = byService[0];
  const untaggedUsd = sumCosts(rows.filter((row) => row.teamTag === ""));
  return {
    totalUsd,
    topService: top?.label ?? null,
    topServiceUsd: top?.costUsd ?? 0,
    untaggedUsd,
    untaggedShare: totalUsd === 0 ? 0 : untaggedUsd / totalUsd,
    dayCount: new Set(rows.map((row) => row.date)).size,
  };
}

export function spendByService(rows: CostRow[]): SpendSlice[] {
  return groupSpend(rows, (row) => row.service);
}

export function spendByTeam(rows: CostRow[]): SpendSlice[] {
  return groupSpend(rows, (row) => (row.teamTag === "" ? "Untagged" : row.teamTag));
}

export function sumCosts(rows: CostRow[]): number {
  return rows.reduce((total, row) => total + row.costUsd, 0);
}

function groupSpend(rows: CostRow[], labelFor: (row: CostRow) => string): SpendSlice[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = labelFor(row);
    totals.set(label, (totals.get(label) ?? 0) + row.costUsd);
  }
  return [...totals.entries()]
    .map(([label, costUsd]) => ({ label, costUsd }))
    .sort((a, b) => b.costUsd - a.costUsd || a.label.localeCompare(b.label));
}
