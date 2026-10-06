import { describe, expect, it } from "vitest";
import { applyFilters, spendByService, spendByTeam, summarize } from "./aggregate";
import type { CostRow } from "./types";
import { UNTAGGED } from "./types";

function row(partial: Partial<CostRow> & Pick<CostRow, "service" | "costUsd">): CostRow {
  return {
    date: "2026-09-01",
    region: "us-east-1",
    teamTag: "payments",
    ...partial,
  };
}

const rows: CostRow[] = [
  row({ service: "EC2", costUsd: 80, teamTag: "payments" }),
  row({ service: "S3", costUsd: 20, teamTag: "", region: "us-east-1" }),
  row({ service: "RDS", costUsd: 40, region: "us-west-2", teamTag: "search" }),
];

describe("applyFilters", () => {
  it("filters by region and by untagged team", () => {
    expect(applyFilters(rows, { region: "us-west-2", team: "" }).map((row) => row.service)).toEqual(["RDS"]);
    expect(applyFilters(rows, { region: "", team: UNTAGGED }).map((row) => row.service)).toEqual(["S3"]);
    expect(applyFilters(rows, { region: "us-east-1", team: "payments" })).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("reports total spend, the top service, and the untagged share", () => {
    const summary = summarize(rows);
    expect(summary.totalUsd).toBe(140);
    expect(summary.topService).toBe("EC2");
    expect(summary.topServiceUsd).toBe(80);
    expect(summary.untaggedUsd).toBe(20);
    expect(summary.untaggedShare).toBeCloseTo(20 / 140);
    expect(summary.dayCount).toBe(1);
  });
});

describe("spend groupings", () => {
  it("sums by service and labels a blank team as Untagged", () => {
    expect(spendByService(rows).map((slice) => [slice.label, slice.costUsd])).toEqual([
      ["EC2", 80],
      ["RDS", 40],
      ["S3", 20],
    ]);
    expect(spendByTeam(rows).find((slice) => slice.label === "Untagged")?.costUsd).toBe(20);
  });
});
