import { sumCosts } from "./aggregate";
import { formatPercent } from "./format";
import type { CostRow, SavingsIdea } from "./types";

const UNTAGGED_SHARE_LIMIT = 0.1;
const EBS_GP3_SAVINGS_RATE = 0.2;

export function periodLengthDays(rows: CostRow[]): number {
  if (rows.length === 0) return 0;
  let start = rows[0].date;
  let end = rows[0].date;
  for (const row of rows) {
    if (row.date < start) start = row.date;
    if (row.date > end) end = row.date;
  }
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}

/** Scale a period total to 30 days. The result is an estimate, not a forecast. */
export function monthlyize(amount: number, days: number): number {
  if (days <= 0) return 0;
  return (amount / days) * 30;
}

export function savingsIdeas(rows: CostRow[]): SavingsIdea[] {
  const ideas: SavingsIdea[] = [];
  const days = periodLengthDays(rows);
  const total = sumCosts(rows);
  const untagged = sumCosts(rows.filter((row) => row.teamTag === ""));
  const untaggedShare = total === 0 ? 0 : untagged / total;

  if (untaggedShare > UNTAGGED_SHARE_LIMIT) {
    ideas.push({
      id: "untagged-share",
      title: "Tag untagged spend",
      detail: `${formatPercent(untaggedShare)} of spend in this view has no team tag. Tagging it shows which team would own the other cuts.`,
      estimateMonthlyUsd: monthlyize(untagged, days),
    });
  }

  const nat = sumCosts(rows.filter((row) => row.service === "NAT Gateway"));
  const s3 = sumCosts(rows.filter((row) => row.service === "S3"));
  if (nat > s3) {
    ideas.push({
      id: "nat-above-s3",
      title: "NAT Gateway costs more than S3",
      detail: "NAT Gateway spend is above S3 spend. The estimate is the monthlyized gap: cross-AZ traffic, missing VPC endpoints, and idle gateways.",
      estimateMonthlyUsd: monthlyize(nat - s3, days),
    });
  }

  const ebs = sumCosts(rows.filter((row) => row.service === "EBS"));
  if (ebs > 0) {
    ideas.push({
      id: "ebs-gp3",
      title: "Review EBS gp2 volumes for gp3",
      detail: "EBS spend is present. Moving gp2 volumes to gp3 is often about 20% cheaper at the same size. The estimate is 20% of monthlyized EBS spend.",
      estimateMonthlyUsd: monthlyize(ebs * EBS_GP3_SAVINGS_RATE, days),
    });
  }

  return ideas;
}
