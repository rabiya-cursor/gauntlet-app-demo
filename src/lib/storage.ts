import type { Filters } from "./types";
import { ALL } from "./types";

const FILTERS_KEY = "cost-lens.filters";
const CSV_KEY = "cost-lens.csv";

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function defaultFilters(): Filters {
  return { region: ALL, team: ALL };
}

export function loadFilters(store: KeyValueStore): Filters {
  const raw = store.getItem(FILTERS_KEY);
  if (!raw) return defaultFilters();
  try {
    const parsed = JSON.parse(raw) as Partial<Filters>;
    if (typeof parsed.region !== "string" || typeof parsed.team !== "string") return defaultFilters();
    return { region: parsed.region, team: parsed.team };
  } catch {
    return defaultFilters();
  }
}

export function saveFilters(store: KeyValueStore, filters: Filters): void {
  store.setItem(FILTERS_KEY, JSON.stringify(filters));
}

export function loadUploadedCsv(store: KeyValueStore): string | null {
  const raw = store.getItem(CSV_KEY);
  return raw && raw.trim() ? raw : null;
}

export function saveUploadedCsv(store: KeyValueStore, csv: string): void {
  store.setItem(CSV_KEY, csv);
}

export function clearUploadedCsv(store: KeyValueStore): void {
  store.removeItem(CSV_KEY);
}
