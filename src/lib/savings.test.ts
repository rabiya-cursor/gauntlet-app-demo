import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCostCsv } from "./csv";
import { savingsIdeas } from "./savings";
import type { CostRow } from "./types";

const sampleCsv = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../public/sample-costs.csv"),
  "utf8",
);

function row(partial: Partial<CostRow> & Pick<CostRow, "service" | "costUsd">): CostRow {
  return {
    date: "2026-09-01",
    region: "us-east-1",
    teamTag: "platform",
    ...partial,
  };
}

describe("savingsIdeas", () => {
  it("emits all three sample-data rules with monthly estimates", () => {
    const ideas = savingsIdeas(parseCostCsv(sampleCsv));
    const byId = Object.fromEntries(ideas.map((idea) => [idea.id, idea]));
    expect(ideas.map((idea) => idea.id)).toEqual(["untagged", "nat-vs-s3", "ebs-gp3"]);
    expect(byId.untagged.estimateMonthlyUsd).toBeGreaterThan(0);
    expect(byId["nat-vs-s3"].estimateMonthlyUsd).toBeGreaterThan(0);
    expect(byId["ebs-gp3"].estimateMonthlyUsd).toBeGreaterThan(0);
  });

  it("skips the untagged idea at or below 10%", () => {
    const rows = [
      row({ service: "EC2", costUsd: 90, teamTag: "payments" }),
      row({ service: "S3", costUsd: 10, teamTag: "" }),
    ];
    expect(savingsIdeas(rows).some((idea) => idea.id === "untagged")).toBe(false);
  });

  it("estimates untagged spend as a 30-day run rate when share is above 10%", () => {
    const rows = [
      row({ service: "EC2", costUsd: 50, teamTag: "payments" }),
      row({ service: "S3", costUsd: 50, teamTag: "" }),
    ];
    const idea = savingsIdeas(rows).find((item) => item.id === "untagged");
    expect(idea?.estimateMonthlyUsd).toBe(1500);
  });

  it("estimates NAT excess over S3 and skips the rule when NAT is not higher", () => {
    const higher = [
      row({ service: "NAT Gateway", costUsd: 80 }),
      row({ service: "S3", costUsd: 20, teamTag: "search" }),
    ];
    const nat = savingsIdeas(higher).find((idea) => idea.id === "nat-vs-s3");
    expect(nat?.estimateMonthlyUsd).toBe(1800);

    const lower = [
      row({ service: "NAT Gateway", costUsd: 10 }),
      row({ service: "S3", costUsd: 40, teamTag: "search" }),
    ];
    expect(savingsIdeas(lower).some((idea) => idea.id === "nat-vs-s3")).toBe(false);
  });

  it("estimates an EBS gp3 review at 20% of monthly EBS spend", () => {
    const rows = [row({ service: "EBS", costUsd: 100 })];
    const idea = savingsIdeas(rows).find((item) => item.id === "ebs-gp3");
    expect(idea?.estimateMonthlyUsd).toBe(600);
  });
});
