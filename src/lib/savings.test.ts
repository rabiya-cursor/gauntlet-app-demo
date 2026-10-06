import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCostCsv } from "./csv";
import {
  EBS_GP3_SAVINGS_RATE,
  NAT_SAVINGS_RATE,
  UNTAGGED_SAVINGS_RATE,
  savingsIdeas,
} from "./savings";
import type { CostRow } from "./types";

function days(count: number, costUsd: number, extra: Partial<CostRow> = {}): CostRow[] {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-03-${String(index + 1).padStart(2, "0")}`,
    service: "Lambda",
    region: "us-east-1",
    teamTag: "platform",
    costUsd,
    ...extra,
  }));
}

describe("savingsIdeas", () => {
  it("suggests tagging when untagged share is above 10%", () => {
    const above = [
      ...days(10, 11, { teamTag: "" }),
      ...days(10, 89, { service: "Lambda", teamTag: "payments" }),
    ];
    const [idea] = savingsIdeas(above);
    expect(idea.id).toBe("untagged");
    expect(idea.estimateMonthlyUsd).toBeCloseTo(11 * 30 * UNTAGGED_SAVINGS_RATE);

    const exact = [...days(10, 10, { teamTag: "" }), ...days(10, 90, { teamTag: "payments" })];
    expect(savingsIdeas(exact).map((item) => item.id)).not.toContain("untagged");
    expect(savingsIdeas([])).toEqual([]);
  });

  it("suggests a NAT review only when NAT Gateway exceeds S3", () => {
    const higher = [
      ...days(1, 50, { service: "NAT Gateway" }),
      ...days(1, 40, { service: "S3" }),
    ];
    const nat = savingsIdeas(higher).find((item) => item.id === "nat-gateway");
    expect(nat?.estimateMonthlyUsd).toBeCloseTo(50 * 30 * NAT_SAVINGS_RATE);

    const equal = [
      ...days(1, 40, { service: "NAT Gateway" }),
      ...days(1, 40, { service: "S3" }),
    ];
    expect(savingsIdeas(equal).map((item) => item.id)).not.toContain("nat-gateway");
  });

  it("suggests a gp2 to gp3 review when EBS spend is present", () => {
    const withEbs = days(2, 10, { service: "EBS", teamTag: "platform" });
    const [idea] = savingsIdeas(withEbs);
    expect(idea.id).toBe("ebs-gp3");
    expect(idea.title).toMatch(/gp2/);
    expect(idea.estimateMonthlyUsd).toBeCloseTo(10 * 30 * EBS_GP3_SAVINGS_RATE);

    expect(savingsIdeas(days(2, 10, { service: "Lambda" })).map((item) => item.id)).not.toContain(
      "ebs-gp3",
    );
  });

  it("fires all three rules on the sample file", () => {
    const { rows, errors } = parseCostCsv(readFileSync("public/sample-costs.csv", "utf8"));
    expect(errors).toEqual([]);
    expect(savingsIdeas(rows).map((item) => item.id)).toEqual(["untagged", "nat-gateway", "ebs-gp3"]);
  });
});
