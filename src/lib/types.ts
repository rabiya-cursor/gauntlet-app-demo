export type CostRow = {
  date: string;
  service: string;
  region: string;
  teamTag: string;
  costUsd: number;
};

export type Filters = {
  region: string;
  team: string;
};

export const ALL = "all";
export const UNTAGGED = "untagged";
