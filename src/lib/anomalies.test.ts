import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { filterRows } from "./aggregate";
import { detectAnomalies } from "./anomalies";
import { parseCostCsv } from "./csv";
import type { CostRow } from "./types";

const sampleCsv = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../public/sample-costs.csv"),
  "utf8",
);

function day(date: string, costUsd: number, region = "us-east-1"): CostRow {
  return { date, service: "Lambda", region, teamTag: "search", costUsd };
}

function series(costs: number[], start = "2026-09-01"): CostRow[] {
  const [year, month, dayOfMonth] = start.split("-").map(Number);
  return costs.map((costUsd, offset) => {
    const date = new Date(Date.UTC(year, month - 1, dayOfMonth + offset));
    const iso = date.toISOString().slice(0, 10);
    return day(iso, costUsd);
  });
}

describe("detectAnomalies", () => {
  it("detects the planted NAT Gateway spike and nothing else in the sample", () => {
    const anomalies = detectAnomalies(parseCostCsv(sampleCsv));
    expect(anomalies.map((item) => `${item.date}|${item.service}|${item.region}`)).toEqual([
      "2026-09-28|NAT Gateway|us-east-1",
      "2026-09-29|NAT Gateway|us-east-1",
    ]);
    expect(anomalies.every((item) => item.ratio > 2)).toBe(true);
    expect(anomalies[0].ratio).toBeCloseTo(3, 5);
  });

  it("does not flag a day that is only 2x its trailing average", () => {
    const rows = series([10, 10, 10, 10, 10, 10, 10, 20]);
    expect(detectAnomalies(rows)).toEqual([]);
  });

  it("flags a day above 2x and ignores a spike in the first week", () => {
    const rows = series([10, 80, 10, 10, 10, 10, 10, 50]);
    const anomalies = detectAnomalies(rows);
    expect(anomalies.map((item) => item.date)).toEqual(["2026-09-08"]);
    expect(anomalies[0].ratio).toBeGreaterThan(2);
  });

  it("drops the planted spike when the region filter excludes us-east-1", () => {
    const rows = filterRows(parseCostCsv(sampleCsv), { region: "us-west-2", team: "all" });
    expect(detectAnomalies(rows)).toEqual([]);
  });
});
