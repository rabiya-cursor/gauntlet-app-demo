import { isHttpUrl, isTag, isValidISODate, type ShipEntry } from "./entries";

export const STORAGE_KEY = "ship-log.entries";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isShipEntry(value: unknown): value is ShipEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.title === "string" &&
    entry.title.trim().length > 0 &&
    typeof entry.link === "string" &&
    (entry.link === "" || isHttpUrl(entry.link)) &&
    typeof entry.tag === "string" &&
    isTag(entry.tag) &&
    typeof entry.date === "string" &&
    isValidISODate(entry.date) &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt)
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

export function saveEntries(store: KeyValueStore, entries: readonly ShipEntry[]): void {
  store.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addEntry(entries: readonly ShipEntry[], entry: ShipEntry): ShipEntry[] {
  return [...entries, entry];
}

export function deleteEntry(entries: readonly ShipEntry[], id: string): ShipEntry[] {
  return entries.filter((entry) => entry.id !== id);
}
