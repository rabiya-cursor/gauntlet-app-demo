import { describe, expect, it } from "vitest";
import { filterRows, spendBy, summarize } from "./aggregate";
import { UNTAGGED_TEAM, type CostRow } from "./types";

function row(partial: Partial<CostRow> & Pick<CostRow, "costUsd">): CostRow {
  return {
    date: "2026-03-01",
    service: "EC2",
    region: "us-east-1",
    teamTag: "payments",
    ...partial,
  };
}

const rows: CostRow[] = [
  row({ date: "2026-03-01", service: "EC2", region: "us-east-1", teamTag: "payments", costUsd: 10 }),
  row({ date: "2026-03-01", service: "S3", region: "us-west-2", teamTag: "search", costUsd: 4 }),
  row({ date: "2026-03-02", service: "EC2", region: "us-west-2", teamTag: "", costUsd: 6 }),
  row({ date: "2026-03-02", service: "RDS", region: "us-east-1", teamTag: "payments", costUsd: 3 }),
];

describe("filterRows", () => {
  it("filters by region and by team, including untagged", () => {
    expect(filterRows(rows, { region: "us-east-1", team: "" }).map((row) => row.service)).toEqual([
      "EC2",
      "RDS",
    ]);
    expect(filterRows(rows, { region: "", team: "payments" })).toHaveLength(2);
    expect(filterRows(rows, { region: "us-west-2", team: UNTAGGED_TEAM })).toEqual([rows[2]]);
    expect(filterRows(rows, { region: "us-east-1", team: "search" })).toEqual([]);
  });
});

describe("summarize and spendBy", () => {
  it("computes total, top service, and untagged share", () => {
    const summary = summarize(rows);
    expect(summary.total).toBe(23);
    expect(summary.topService).toEqual({ name: "EC2", cost: 16 });
    expect(summary.untaggedCost).toBe(6);
    expect(summary.untaggedPct).toBeCloseTo((6 / 23) * 100);
    expect(summary.dayCount).toBe(2);

    const tied = summarize([
      row({ service: "S3", costUsd: 5 }),
      row({ service: "EC2", costUsd: 5 }),
    ]);
    expect(tied.topService?.name).toBe("EC2");
    expect(summarize([]).untaggedPct).toBe(0);
    expect(summarize([]).topService).toBeNull();
  });

  it("groups spend by service and by team", () => {
    expect(spendBy(rows, "service")).toEqual([
      { label: "EC2", cost: 16 },
      { label: "S3", cost: 4 },
      { label: "RDS", cost: 3 },
    ]);
    expect(spendBy(rows, "teamTag")).toEqual([
      { label: "payments", cost: 13 },
      { label: "Untagged", cost: 6 },
      { label: "search", cost: 4 },
    ]);
  });
});
