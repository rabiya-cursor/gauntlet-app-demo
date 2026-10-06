import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectAnomalies } from "./anomalies";
import { parseCostCsv } from "./csv";
import type { CostRow } from "./types";

function row(date: string, costUsd: number, extra: Partial<CostRow> = {}): CostRow {
  return {
    date,
    service: "EC2",
    region: "us-east-1",
    teamTag: "payments",
    costUsd,
    ...extra,
  };
}

describe("detectAnomalies", () => {
  it("detects the planted NAT Gateway spike and nothing else", () => {
    const csv = readFileSync("public/sample-costs.csv", "utf8");
    const { rows, errors } = parseCostCsv(csv);
    expect(errors).toEqual([]);

    const dates = new Set(rows.map((row) => row.date));
    const services = new Set(rows.map((row) => row.service));
    const regions = new Set(rows.map((row) => row.region));
    expect(dates.size).toBe(30);
    expect(services).toEqual(
      new Set(["EC2", "RDS", "S3", "EBS", "Lambda", "CloudFront", "NAT Gateway", "DynamoDB"]),
    );
    expect(regions).toEqual(new Set(["us-east-1", "us-west-2"]));
    expect(rows).toHaveLength(30 * 8 * 2);

    const natEast = rows.filter((row) => row.service === "NAT Gateway" && row.region === "us-east-1");
    const spiked = natEast.filter((row) => row.date === "2026-03-28" || row.date === "2026-03-29");
    const normal = natEast.filter((row) => row.date !== "2026-03-28" && row.date !== "2026-03-29");
    const normalAvg = normal.reduce((sum, row) => sum + row.costUsd, 0) / normal.length;
    expect(spiked).toHaveLength(2);
    for (const spike of spiked) {
      expect(spike.costUsd).toBeGreaterThan(normalAvg * 2.5);
      expect(spike.costUsd).toBeLessThan(normalAvg * 3.5);
    }

    const anomalies = detectAnomalies(rows);
    expect(anomalies.map((item) => [item.date, item.service, item.region])).toEqual([
      ["2026-03-28", "NAT Gateway", "us-east-1"],
      ["2026-03-29", "NAT Gateway", "us-east-1"],
    ]);
    expect(anomalies.every((item) => item.costUsd > item.trailingAvg * 2)).toBe(true);
  });

  it("flags a day only when it is more than twice the prior 7 calendar days", () => {
    const flat = [1, 2, 3, 4, 5, 6, 7].map((day) => row(`2026-03-0${day}`, 10));
    const exactlyDouble = row("2026-03-08", 20);
    const aboveDouble = row("2026-03-09", 30);
    const anomalies = detectAnomalies([...flat, exactlyDouble, aboveDouble]);

    expect(anomalies.map((item) => item.date)).toEqual(["2026-03-09"]);
    expect(anomalies[0].trailingAvg).toBeCloseTo((10 * 6 + 20) / 7);

    const earlySpike = detectAnomalies([row("2026-03-01", 1000), ...flat.slice(1)]);
    expect(earlySpike).toEqual([]);

    const gap = detectAnomalies([
      ...[1, 2, 3, 4, 5, 6, 7].map((day) => row(`2026-03-0${day}`, 10)),
      row("2026-03-09", 100),
    ]);
    expect(gap).toEqual([]);

    const splitTeams = detectAnomalies([
      ...flat,
      row("2026-03-08", 16, { teamTag: "payments" }),
      row("2026-03-08", 15, { teamTag: "search" }),
    ]);
    expect(splitTeams).toHaveLength(1);
    expect(splitTeams[0].costUsd).toBe(31);
  });
});
