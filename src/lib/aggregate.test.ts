import { describe, expect, it } from "vitest";
import { filterRows, spendByService, spendByTeam, summarize } from "./aggregate";
import type { CostRow } from "./types";

const rows: CostRow[] = [
  { date: "2026-09-01", service: "EC2", region: "us-east-1", teamTag: "payments", costUsd: 100 },
  { date: "2026-09-01", service: "S3", region: "us-east-1", teamTag: "", costUsd: 20 },
  { date: "2026-09-01", service: "EC2", region: "us-west-2", teamTag: "search", costUsd: 50 },
  { date: "2026-09-02", service: "RDS", region: "us-west-2", teamTag: "payments", costUsd: 30 },
];

describe("summarize", () => {
  it("totals spend, names the top service, and reports untagged share", () => {
    const summary = summarize(rows);
    expect(summary.totalUsd).toBe(200);
    expect(summary.topService).toBe("EC2");
    expect(summary.topServiceUsd).toBe(150);
    expect(summary.untaggedUsd).toBe(20);
    expect(summary.untaggedPct).toBe(10);
    expect(summary.dayCount).toBe(2);
    expect(summary.periodStart).toBe("2026-09-01");
    expect(summary.periodEnd).toBe("2026-09-02");
  });

  it("breaks a top-service tie alphabetically", () => {
    const tied: CostRow[] = [
      { date: "2026-09-01", service: "RDS", region: "us-east-1", teamTag: "platform", costUsd: 10 },
      { date: "2026-09-01", service: "EBS", region: "us-east-1", teamTag: "platform", costUsd: 10 },
    ];
    expect(summarize(tied).topService).toBe("EBS");
  });
});

describe("filterRows", () => {
  it("filters by region", () => {
    const filtered = filterRows(rows, { region: "us-west-2", team: "all" });
    expect(summarize(filtered).totalUsd).toBe(80);
    expect(filtered.every((row) => row.region === "us-west-2")).toBe(true);
  });

  it("filters by team, including untagged", () => {
    expect(summarize(filterRows(rows, { region: "all", team: "payments" })).totalUsd).toBe(130);
    const untagged = filterRows(rows, { region: "all", team: "untagged" });
    expect(untagged).toHaveLength(1);
    expect(untagged[0].service).toBe("S3");
  });
});

describe("spend bars", () => {
  it("orders services and teams by spend", () => {
    expect(spendByService(rows).map((bar) => bar.label)).toEqual(["EC2", "RDS", "S3"]);
    expect(spendByTeam(rows).map((bar) => bar.label)).toEqual(["payments", "search", "untagged"]);
  });
});
