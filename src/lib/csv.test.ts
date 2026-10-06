import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CsvParseError, parseCostCsv } from "./csv";

const samplePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/sample-costs.csv");

describe("parseCostCsv", () => {
  it("parses rows, including an empty team tag", () => {
    const rows = parseCostCsv("date,service,region,team_tag,cost_usd\n2026-09-01,S3,us-east-1,,12.50\n");
    expect(rows).toEqual([
      { date: "2026-09-01", service: "S3", region: "us-east-1", teamTag: "", costUsd: 12.5 },
    ]);
  });

  it("unquotes fields and skipped blank lines", () => {
    const csv = 'date,service,region,team_tag,cost_usd\n\n2026-09-02,"NAT Gateway",us-west-2,"search",8\n';
    const rows = parseCostCsv(csv);
    expect(rows[0]).toMatchObject({ service: "NAT Gateway", teamTag: "search", costUsd: 8 });
  });

  it("rejects a file missing a required column", () => {
    expect(() => parseCostCsv("date,service,region,cost_usd\n2026-09-01,EC2,us-east-1,1\n")).toThrow(CsvParseError);
    expect(() => parseCostCsv("date,service,region,cost_usd\n")).toThrow(/team_tag/);
  });

  it("rejects a non-numeric cost and a bad date", () => {
    const header = "date,service,region,team_tag,cost_usd\n";
    expect(() => parseCostCsv(`${header}2026-09-01,EC2,us-east-1,payments,abc\n`)).toThrow(/cost_usd/);
    expect(() => parseCostCsv(`${header}09/01/2026,EC2,us-east-1,payments,1\n`)).toThrow(/date/);
  });

  it("rejects an empty cost instead of storing it as zero", () => {
    const header = "date,service,region,team_tag,cost_usd\n";
    expect(() => parseCostCsv(`${header}2026-09-01,EC2,us-east-1,payments,\n`)).toThrow(/cost_usd/);
    expect(() => parseCostCsv(`${header}2026-09-01,EC2,us-east-1,payments,   \n`)).toThrow(/cost_usd/);
    expect(parseCostCsv(`${header}2026-09-01,EC2,us-east-1,payments,0\n`)[0].costUsd).toBe(0);
  });

  it("loads the sample file: 30 days, 8 services, 2 regions", () => {
    const rows = parseCostCsv(readFileSync(samplePath, "utf8"));
    expect(new Set(rows.map((row) => row.date)).size).toBe(30);
    expect(rows[0].date).toBe("2026-09-01");
    expect(rows[rows.length - 1].date).toBe("2026-09-30");
    expect(new Set(rows.map((row) => row.service))).toEqual(
      new Set(["EC2", "RDS", "S3", "EBS", "Lambda", "CloudFront", "NAT Gateway", "DynamoDB"]),
    );
    expect(new Set(rows.map((row) => row.region))).toEqual(new Set(["us-east-1", "us-west-2"]));
    expect(rows.some((row) => row.teamTag === "")).toBe(true);
    expect(rows.some((row) => row.teamTag === "payments")).toBe(true);
  });
});
