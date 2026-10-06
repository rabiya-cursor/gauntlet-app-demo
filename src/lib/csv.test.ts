import { describe, expect, it } from "vitest";
import { parseCostCsv } from "./csv";

const HEADER = "date,service,region,team_tag,cost_usd";

describe("parseCostCsv", () => {
  it("parses rows, including a blank team_tag and reordered columns", () => {
    const text = [
      "cost_usd,team_tag,region,service,date",
      "12.50,,us-west-2,S3,2026-03-02",
      '4.00,payments,us-east-1,EC2,2026-03-01',
    ].join("\n");

    const { rows, errors } = parseCostCsv(`\uFEFF${text}\r\n`);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { date: "2026-03-02", service: "S3", region: "us-west-2", teamTag: "", costUsd: 12.5 },
      { date: "2026-03-01", service: "EC2", region: "us-east-1", teamTag: "payments", costUsd: 4 },
    ]);
  });

  it("reports a missing header, a bad date, and a bad cost", () => {
    expect(parseCostCsv("a,b\n1,2").errors[0]).toMatch(/Missing columns/);
    expect(parseCostCsv("").errors).toEqual(["CSV is empty."]);
    expect(parseCostCsv(`${HEADER}\n`).errors[0]).toMatch(/no data rows/);

    const badDate = parseCostCsv(`${HEADER}\n2026-02-31,EC2,us-east-1,payments,1`);
    expect(badDate.rows).toEqual([]);
    expect(badDate.errors[0]).toMatch(/Line 2: date must be YYYY-MM-DD/);

    const badCost = parseCostCsv(`${HEADER}\n2026-03-01,EC2,us-east-1,payments,-5`);
    expect(badCost.errors[0]).toMatch(/cost_usd must be a non-negative number/);

    const mixed = parseCostCsv(
      `${HEADER}\n2026-03-01,EC2,us-east-1,,2.5\n2026-03-02,EC2,us-east-1,payments,nope`,
    );
    expect(mixed.rows).toHaveLength(1);
    expect(mixed.errors).toHaveLength(1);
  });
});
