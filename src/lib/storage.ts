import { isTag, type ShipEntry } from "./types";

export const STORAGE_KEY = "ship-log.entries";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isShipEntry(value: unknown): value is ShipEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.link === "string" &&
    typeof entry.tag === "string" &&
    isTag(entry.tag) &&
    typeof entry.date === "string" &&
    typeof entry.createdAt === "string"
  );
}

export function loadEntries(store: KeyValueStore): ShipEntry[] {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShipEntry);
  } catch {
    return [];
  }
}

export function saveEntries(store: KeyValueStore, entries: ShipEntry[]): void {
  store.setItem(STORAGE_KEY, JSON.stringify(entries));
}
