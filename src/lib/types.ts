export type CostRow = {
  date: string;
  service: string;
  region: string;
  teamTag: string;
  costUsd: number;
};

export type Filters = {
  /** Empty string means every region. */
  region: string;
  /** Empty string means every team. `UNTAGGED_TEAM` means a blank team_tag. */
  team: string;
};

export const UNTAGGED_TEAM = "__untagged__";
