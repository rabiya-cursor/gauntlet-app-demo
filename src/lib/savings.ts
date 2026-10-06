import type { CostRow } from "./types";

/** Share of spend with a blank team_tag that triggers a tagging idea. */
export const UNTAGGED_SHARE_THRESHOLD = 0.1;
/** Rules of thumb, not price quotes. The UI labels every figure as an estimate. */
export const UNTAGGED_SAVINGS_RATE = 0.2;
export const NAT_SAVINGS_RATE = 0.3;
export const EBS_GP3_SAVINGS_RATE = 0.2;

export type SavingsIdea = {
  id: string;
  title: string;
  detail: string;
  estimateMonthlyUsd: number;
};

function distinctDays(rows: CostRow[]): number {
  return new Set(rows.map((row) => row.date)).size;
}

function monthlyize(total: number, days: number): number {
  if (days <= 0) return 0;
  return (total / days) * 30;
}

function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function sumWhere(rows: CostRow[], predicate: (row: CostRow) => boolean): number {
  return rows.reduce((sum, row) => sum + (predicate(row) ? row.costUsd : 0), 0);
}

export function savingsIdeas(rows: CostRow[]): SavingsIdea[] {
  const ideas: SavingsIdea[] = [];
  const days = distinctDays(rows);
  const total = sumWhere(rows, () => true);
  const untagged = sumWhere(rows, (row) => row.teamTag === "");

  if (total > 0 && untagged / total > UNTAGGED_SHARE_THRESHOLD) {
    const sharePct = ((untagged / total) * 100).toFixed(1);
    ideas.push({
      id: "untagged",
      title: "Assign owners to untagged spend",
      detail: `${sharePct}% of spend has no team_tag. Tagging usually surfaces waste once a team owns it.`,
      estimateMonthlyUsd: cents(monthlyize(untagged, days) * UNTAGGED_SAVINGS_RATE),
    });
  }

  const nat = sumWhere(rows, (row) => row.service === "NAT Gateway");
  const s3 = sumWhere(rows, (row) => row.service === "S3");
  if (nat > s3) {
    ideas.push({
      id: "nat-gateway",
      title: "Review NAT Gateway against S3",
      detail:
        "NAT Gateway spend is higher than S3. Check cross-AZ traffic and whether VPC endpoints would shrink the NAT bill.",
      estimateMonthlyUsd: cents(monthlyize(nat, days) * NAT_SAVINGS_RATE),
    });
  }

  const ebs = sumWhere(rows, (row) => row.service === "EBS");
  if (ebs > 0) {
    ideas.push({
      id: "ebs-gp3",
      title: "Review EBS gp2 volumes for gp3",
      detail: "EBS spend is in this view. gp3 is often cheaper than gp2 for the same size and baseline performance.",
      estimateMonthlyUsd: cents(monthlyize(ebs, days) * EBS_GP3_SAVINGS_RATE),
    });
  }

  return ideas;
}
