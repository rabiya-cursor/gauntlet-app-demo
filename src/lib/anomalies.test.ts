import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectAnomalies } from "./anomalies";
import { parseCostCsv } from "./csv";
import type { CostRow } from "./types";

const samplePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/sample-costs.csv");

function series(costs: number[], service = "EC2", region = "us-east-1"): CostRow[] {
  return costs.map((costUsd, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    service,
    region,
    teamTag: "payments",
    costUsd,
  }));
}

describe("detectAnomalies", () => {
  it("flags a day more than twice the trailing 7-day average", () => {
    const found = detectAnomalies(series([10, 10, 10, 10, 10, 10, 10, 21]));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      date: "2026-09-08",
      service: "EC2",
      region: "us-east-1",
      costUsd: 21,
      trailingAverageUsd: 10,
    });
    expect(found[0].ratio).toBeCloseTo(2.1);
  });

  it("does not flag a day that is exactly twice the trailing average", () => {
    expect(detectAnomalies(series([10, 10, 10, 10, 10, 10, 10, 20]))).toHaveLength(0);
  });

  it("does not flag a spike before seven prior days exist", () => {
    expect(detectAnomalies(series([1, 1, 1, 1, 1, 1, 100]))).toHaveLength(0);
  });

  it("sums rows that share a service, region, and day before comparing", () => {
    const base = series([10, 10, 10, 10, 10, 10, 10, 10]);
    const extra: CostRow = { ...base[7], costUsd: 15 };
    const found = detectAnomalies([...base, extra]);
    expect(found).toHaveLength(1);
    expect(found[0].costUsd).toBe(25);
  });

  it("detects the planted NAT Gateway spike in the sample file", () => {
    const rows = parseCostCsv(readFileSync(samplePath, "utf8"));
    const anomalies = detectAnomalies(rows);
    const planted = anomalies.filter((item) => item.service === "NAT Gateway" && item.region === "us-east-1");

    expect(planted.map((item) => item.date)).toEqual(["2026-09-30", "2026-09-29"]);
    expect(planted.every((item) => item.ratio > 2)).toBe(true);
    expect(planted.find((item) => item.date === "2026-09-29")?.ratio).toBeGreaterThan(2.8);
    expect(planted.find((item) => item.date === "2026-09-29")?.ratio).toBeLessThan(3.2);

    const other = anomalies.filter((item) => !(item.service === "NAT Gateway" && item.region === "us-east-1"));
    expect(other).toEqual([]);
  });
});
