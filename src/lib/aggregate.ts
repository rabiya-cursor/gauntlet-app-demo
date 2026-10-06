import { UNTAGGED_TEAM, type CostRow, type Filters } from "./types";

export type Summary = {
  total: number;
  topService: { name: string; cost: number } | null;
  untaggedCost: number;
  untaggedPct: number;
  dayCount: number;
};

export type SpendBar = {
  label: string;
  cost: number;
};

export function filterRows(rows: CostRow[], filters: Filters): CostRow[] {
  return rows.filter((row) => {
    if (filters.region && row.region !== filters.region) return false;
    if (filters.team === UNTAGGED_TEAM) return row.teamTag === "";
    if (filters.team) return row.teamTag === filters.team;
    return true;
  });
}

export function summarize(rows: CostRow[]): Summary {
  const total = rows.reduce((sum, row) => sum + row.costUsd, 0);
  const untaggedCost = rows.reduce((sum, row) => sum + (row.teamTag === "" ? row.costUsd : 0), 0);
  const byService = spendBy(rows, "service");
  return {
    total,
    topService: byService[0] ? { name: byService[0].label, cost: byService[0].cost } : null,
    untaggedCost,
    untaggedPct: total === 0 ? 0 : (untaggedCost / total) * 100,
    dayCount: new Set(rows.map((row) => row.date)).size,
  };
}

export function spendBy(rows: CostRow[], key: "service" | "teamTag"): SpendBar[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = key === "teamTag" ? row.teamTag || "Untagged" : row.service;
    totals.set(label, (totals.get(label) ?? 0) + row.costUsd);
  }
  return [...totals.entries()]
    .map(([label, cost]) => ({ label, cost }))
    .sort((a, b) => b.cost - a.cost || a.label.localeCompare(b.label));
}
