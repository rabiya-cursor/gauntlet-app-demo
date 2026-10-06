import { describe, expect, it } from "vitest";
import { addEntry } from "./entries";
import { STORAGE_KEY, loadEntries, saveEntries, type KeyValueStore } from "./storage";

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("storage", () => {
  it("round-trips entries and ignores corrupt data", () => {
    const store = new MemoryStore();
    expect(loadEntries(store)).toEqual([]);

    const added = addEntry(
      [],
      { title: "Persist me", tag: "infra", link: "https://example.com" },
      new Date(2026, 9, 5, 12, 0, 0),
      "saved",
    );
    if (!added.ok) throw new Error("expected a valid entry");

    saveEntries(store, added.entries);
    expect(loadEntries(store)).toEqual(added.entries);
    expect(store.getItem(STORAGE_KEY)).toContain("Persist me");

    store.setItem(STORAGE_KEY, "{not json");
    expect(loadEntries(store)).toEqual([]);

    store.setItem(STORAGE_KEY, JSON.stringify([{ title: "missing fields" }, added.entries[0]]));
    expect(loadEntries(store)).toEqual(added.entries);
  });
});
