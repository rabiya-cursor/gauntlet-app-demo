import { describe, expect, it } from "vitest";
import { monthlyize, periodLengthDays, savingsIdeas } from "./savings";
import type { CostRow } from "./types";

function row(partial: Partial<CostRow> & Pick<CostRow, "service" | "costUsd" | "teamTag">): CostRow {
  return {
    date: "2026-09-01",
    region: "us-east-1",
    ...partial,
  };
}

describe("monthlyize", () => {
  it("scales a span of calendar days to 30", () => {
    const rows = [
      row({ date: "2026-09-01", service: "EC2", teamTag: "payments", costUsd: 10 }),
      row({ date: "2026-09-30", service: "EC2", teamTag: "payments", costUsd: 20 }),
    ];
    expect(periodLengthDays(rows)).toBe(30);
    expect(monthlyize(30, 30)).toBe(30);
    expect(monthlyize(0, 0)).toBe(0);
  });
});

describe("savingsIdeas", () => {
  it("estimates monthly untagged spend when the share is above 10%", () => {
    const ideas = savingsIdeas([
      row({ service: "S3", teamTag: "", costUsd: 20 }),
      row({ service: "EC2", teamTag: "payments", costUsd: 80 }),
    ]);
    const idea = ideas.find((item) => item.id === "untagged-share");
    expect(idea?.estimateMonthlyUsd).toBeCloseTo(600);
    expect(idea?.detail).toContain("20.0%");
  });

  it("stays quiet when untagged spend is exactly 10%", () => {
    const ideas = savingsIdeas([
      row({ service: "S3", teamTag: "", costUsd: 10 }),
      row({ service: "EC2", teamTag: "payments", costUsd: 90 }),
    ]);
    expect(ideas.some((item) => item.id === "untagged-share")).toBe(false);
  });

  it("estimates the monthly gap when NAT Gateway exceeds S3", () => {
    const ideas = savingsIdeas([
      row({ service: "NAT Gateway", teamTag: "platform", costUsd: 100 }),
      row({ service: "S3", teamTag: "platform", costUsd: 40 }),
    ]);
    const idea = ideas.find((item) => item.id === "nat-above-s3");
    expect(idea?.estimateMonthlyUsd).toBeCloseTo(1800);
  });

  it("does not suggest a NAT review when NAT is at or below S3", () => {
    const ideas = savingsIdeas([
      row({ service: "NAT Gateway", teamTag: "platform", costUsd: 10 }),
      row({ service: "S3", teamTag: "platform", costUsd: 10 }),
    ]);
    expect(ideas.some((item) => item.id === "nat-above-s3")).toBe(false);
  });

  it("estimates 20% of monthlyized EBS spend when EBS is present", () => {
    const ideas = savingsIdeas([row({ service: "EBS", teamTag: "platform", costUsd: 50 })]);
    const idea = ideas.find((item) => item.id === "ebs-gp3");
    expect(idea?.title).toMatch(/gp3/);
    expect(idea?.estimateMonthlyUsd).toBeCloseTo(50 * 0.2 * 30);
  });

  it("returns no ideas when none of the rules match", () => {
    const ideas = savingsIdeas([
      row({ service: "Lambda", teamTag: "search", costUsd: 95 }),
      row({ service: "S3", teamTag: "", costUsd: 5 }),
    ]);
    expect(ideas).toEqual([]);
  });
});
