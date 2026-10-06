export type CostRow = {
  date: string;
  service: string;
  region: string;
  teamTag: string;
  costUsd: number;
};

/** Empty string means every region or every team. */
export type Filters = {
  region: string;
  team: string;
};

export const ALL = "";
export const UNTAGGED = "__untagged__";

export type Summary = {
  totalUsd: number;
  topService: string | null;
  topServiceUsd: number;
  untaggedUsd: number;
  untaggedShare: number;
  dayCount: number;
};

export type SpendSlice = {
  label: string;
  costUsd: number;
};

export type Anomaly = {
  date: string;
  service: string;
  region: string;
  costUsd: number;
  trailingAverageUsd: number;
  ratio: number;
};

export type SavingsIdea = {
  id: string;
  title: string;
  detail: string;
  estimateMonthlyUsd: number;
};
