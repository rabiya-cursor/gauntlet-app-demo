import { describe, expect, it } from "vitest";
import { parseCostCsv } from "./csv";

const header = "date,service,region,team_tag,cost_usd";

describe("parseCostCsv", () => {
  it("parses rows and keeps an empty team tag", () => {
    const rows = parseCostCsv(
      `${header}\n2026-09-01,S3,us-east-1,,12.50\n2026-09-01,EC2,us-west-2,payments,40`,
    );
    expect(rows).toEqual([
      {
        date: "2026-09-01",
        service: "S3",
        region: "us-east-1",
        teamTag: "",
        costUsd: 12.5,
      },
      {
        date: "2026-09-01",
        service: "EC2",
        region: "us-west-2",
        teamTag: "payments",
        costUsd: 40,
      },
    ]);
  });

  it("accepts a BOM and mixed-case headers", () => {
    const rows = parseCostCsv(
      `\uFEFFDate,Service,Region,Team_Tag,Cost_USD\n2026-09-02,Lambda,us-east-1,search,3.25`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].service).toBe("Lambda");
    expect(rows[0].costUsd).toBe(3.25);
  });

  it("rejects a missing column", () => {
    expect(() => parseCostCsv("date,service,region,cost_usd\n2026-09-01,S3,us-east-1,1")).toThrow(
      /Missing column: team_tag/,
    );
  });

  it("rejects a non-numeric cost", () => {
    expect(() => parseCostCsv(`${header}\n2026-09-01,S3,us-east-1,search,abc`)).toThrow(
      /invalid cost_usd/,
    );
  });
});
