import { describe, expect, it } from "vitest";
import { addEntry } from "./entries";
import { STORAGE_KEY, loadEntries, saveEntries, type KeyValueStore } from "./storage";

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("storage", () => {
  it("round-trips entries through a key-value store", () => {
    const store = new MemoryStore();
    expect(loadEntries(store)).toEqual([]);

    const added = addEntry(
      [],
      { title: "Persist me", tag: "infra", link: "https://example.com" },
      new Date(2026, 9, 6, 12, 0, 0),
      "saved-1",
    );
    if (!added.ok) throw new Error("expected a valid entry");

    saveEntries(store, added.entries);
    expect(store.getItem(STORAGE_KEY)).toContain("Persist me");
    expect(loadEntries(store)).toEqual(added.entries);
  });

  it("returns an empty list for corrupt or non-entry data", () => {
    const corrupt = new MemoryStore();
    corrupt.setItem(STORAGE_KEY, "{not json");
    expect(loadEntries(corrupt)).toEqual([]);

    const mixed = new MemoryStore();
    mixed.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { nope: true },
        {
          id: "ok",
          title: "Kept",
          link: "",
          tag: "docs",
          date: "2026-10-02",
          createdAt: "2026-10-02T00:00:00.000Z",
        },
        {
          id: "",
          title: "Blank id",
          link: "",
          tag: "docs",
          date: "2026-10-02",
          createdAt: "2026-10-02T00:00:00.000Z",
        },
      ]),
    );
    expect(loadEntries(mixed).map((entry) => entry.title)).toEqual(["Kept"]);
  });
});
