import { describe, expect, it } from "vitest";
import type { ShipEntry } from "./entries";
import {
  STORAGE_KEY,
  addEntry,
  deleteEntry,
  loadEntries,
  saveEntries,
  type KeyValueStore,
} from "./storage";

function memoryStore(initial?: string): KeyValueStore & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  if (initial !== undefined) raw.set(STORAGE_KEY, initial);
  return {
    raw,
    getItem: (key) => raw.get(key) ?? null,
    setItem: (key, value) => {
      raw.set(key, value);
    },
  };
}

function entry(id: string): ShipEntry {
  return {
    id,
    title: `Ship ${id}`,
    link: "https://example.com/" + id,
    tag: "fix",
    date: "2026-10-06",
    createdAt: Number(id),
  };
}

describe("storage", () => {
  it("round-trips entries and drops corrupt records", () => {
    const store = memoryStore();
    const kept = entry("2");
    saveEntries(store, [entry("1"), kept]);
    expect(loadEntries(store)).toEqual([entry("1"), kept]);

    store.setItem(
      STORAGE_KEY,
      JSON.stringify([kept, { id: "bad", title: "" }, "nope"]),
    );
    expect(loadEntries(store)).toEqual([kept]);
    expect(loadEntries(memoryStore("not-json"))).toEqual([]);
    expect(loadEntries(memoryStore())).toEqual([]);
  });

  it("adds and deletes by id", () => {
    const first = entry("1");
    const second = entry("2");
    const added = addEntry([first], second);
    expect(added).toEqual([first, second]);
    expect(deleteEntry(added, "1")).toEqual([second]);
    expect(deleteEntry(added, "missing")).toEqual(added);
  });
});
