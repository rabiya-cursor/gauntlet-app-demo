import { summarize } from "./aggregate";
import type { CostRow } from "./types";

export type SavingsIdea = {
  id: string;
  title: string;
  detail: string;
  estimateMonthlyUsd: number;
};

const DAYS_IN_MONTH = 30;
// gp3 list price is about 20% below gp2 for the same volume size.
const EBS_GP3_SAVINGS_RATE = 0.2;

export function savingsIdeas(rows: CostRow[]): SavingsIdea[] {
  const summary = summarize(rows);
  if (summary.dayCount === 0) return [];

  const ideas: SavingsIdea[] = [];
  const days = summary.dayCount;

  if (summary.untaggedPct > 10) {
    ideas.push({
      id: "untagged",
      title: "Untagged spend is above 10%",
      detail: `${summary.untaggedPct.toFixed(1)}% of spend in this view has an empty team tag. Assign owners so the cost can be charged back.`,
      estimateMonthlyUsd: monthly(summary.untaggedUsd, days),
    });
  }

  const nat = sumService(rows, "nat gateway");
  const s3 = sumService(rows, "s3");
  if (nat > s3) {
    ideas.push({
      id: "nat-vs-s3",
      title: "NAT Gateway spend is above S3",
      detail:
        "NAT Gateway costs more than S3 here. Check for idle gateways, missing VPC endpoints, and cross-AZ traffic.",
      estimateMonthlyUsd: monthly(nat - s3, days),
    });
  }

  const ebs = sumService(rows, "ebs");
  if (ebs > 0) {
    ideas.push({
      id: "ebs-gp3",
      title: "Review EBS volumes for gp2 to gp3",
      detail:
        "EBS spend is present. Moving gp2 volumes to gp3 is often about 20% cheaper at the same size.",
      estimateMonthlyUsd: monthly(ebs, days) * EBS_GP3_SAVINGS_RATE,
    });
  }

  return ideas;
}

function sumService(rows: CostRow[], service: string): number {
  return rows
    .filter((row) => row.service.trim().toLowerCase() === service)
    .reduce((total, row) => total + row.costUsd, 0);
}

function monthly(total: number, observedDays: number): number {
  return (total / observedDays) * DAYS_IN_MONTH;
}
