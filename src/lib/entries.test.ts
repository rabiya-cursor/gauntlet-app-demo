import { describe, expect, it } from "vitest";
import {
  filterByTag,
  shownCount,
  sortNewestFirst,
  validateEntry,
  visibleEntries,
  type ShipEntry,
} from "./entries";

const now = new Date(2026, 9, 6, 12, 0, 0);

function entry(overrides: Partial<ShipEntry> = {}): ShipEntry {
  return {
    id: "1",
    title: "Shipped search",
    link: "",
    tag: "feature",
    date: "2026-10-06",
    createdAt: 1,
    ...overrides,
  };
}

describe("validateEntry", () => {
  it("rejects an empty title", () => {
    const result = validateEntry(
      { title: "   ", link: "", tag: "fix", date: "2026-10-06" },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.field === "title")).toBe(true);
    }
  });

  it("allows a blank link and defaults the date to today", () => {
    const result = validateEntry({ title: "Notes", link: "  ", tag: "docs" }, now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.link).toBe("");
      expect(result.value.date).toBe("2026-10-06");
      expect(result.value.title).toBe("Notes");
    }
  });

  it("accepts http and https links", () => {
    for (const link of ["https://example.com/ship", "http://localhost:5173/log"]) {
      const result = validateEntry(
        { title: "Link", link, tag: "infra", date: "2026-10-01" },
        now,
      );
      expect(result.ok).toBe(true);
    }
  });

  it("rejects links that are not http or https", () => {
    for (const link of ["javascript:alert(1)", "ftp://files.example", "notaurl"]) {
      const result = validateEntry(
        { title: "Bad link", link, tag: "other", date: "2026-10-01" },
        now,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.field === "link")).toBe(true);
      }
    }
  });

  it("rejects an unknown tag and an impossible date", () => {
    const result = validateEntry(
      { title: "Oops", link: "", tag: "launch", date: "2026-02-31" },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.field).sort()).toEqual(["date", "tag"]);
    }
  });
});

describe("listing", () => {
  const entries = [
    entry({ id: "old", date: "2026-10-01", createdAt: 10, tag: "fix" }),
    entry({ id: "same-late", date: "2026-10-06", createdAt: 30, tag: "feature" }),
    entry({ id: "same-early", date: "2026-10-06", createdAt: 20, tag: "docs" }),
    entry({ id: "mid", date: "2026-10-04", createdAt: 15, tag: "feature" }),
  ];

  it("filters by tag and counts what is shown", () => {
    expect(filterByTag(entries, "feature").map((item) => item.id)).toEqual([
      "same-late",
      "mid",
    ]);
    expect(shownCount(entries, "feature")).toBe(2);
    expect(shownCount(entries, "all")).toBe(4);
    expect(filterByTag(entries, "infra")).toEqual([]);
  });

  it("sorts newest date first, then newest createdAt", () => {
    expect(sortNewestFirst(entries).map((item) => item.id)).toEqual([
      "same-late",
      "same-early",
      "mid",
      "old",
    ]);
    expect(visibleEntries(entries, "feature").map((item) => item.id)).toEqual([
      "same-late",
      "mid",
    ]);
  });
});
