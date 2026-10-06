import { describe, expect, it } from "vitest";
import {
  clearUploadedCsv,
  loadFilters,
  loadUploadedCsv,
  saveFilters,
  saveUploadedCsv,
  type KeyValueStore,
} from "./storage";

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("local storage helpers", () => {
  it("round-trips filters and an uploaded CSV", () => {
    const store = memoryStore();
    expect(loadFilters(store)).toEqual({ region: "", team: "" });
    expect(loadUploadedCsv(store)).toBeNull();

    saveFilters(store, { region: "us-east-1", team: "__untagged__" });
    saveUploadedCsv(store, "date,service,region,team_tag,cost_usd\n");
    expect(loadFilters(store)).toEqual({ region: "us-east-1", team: "__untagged__" });
    expect(loadUploadedCsv(store)).toContain("cost_usd");

    clearUploadedCsv(store);
    expect(loadUploadedCsv(store)).toBeNull();
  });

  it("ignores a corrupt filters payload", () => {
    const store = memoryStore();
    store.setItem("cost-lens.filters", "{");
    expect(loadFilters(store)).toEqual({ region: "", team: "" });
  });
});
