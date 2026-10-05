import { describe, expect, it } from "vitest";
import { addEntry, countLabel, deleteEntry, visibleEntries } from "./entries";
import type { ShipEntry } from "./types";

const morning = new Date(2026, 9, 5, 9, 0, 0);
const afternoon = new Date(2026, 9, 5, 16, 0, 0);

function seed(): ShipEntry[] {
  const first = addEntry([], { title: "Older fix", tag: "fix", date: "2026-10-01" }, morning, "a");
  if (!first.ok) throw new Error("seed failed");
  const second = addEntry(
    first.entries,
    { title: "Morning feature", tag: "feature", date: "2026-10-05" },
    morning,
    "b",
  );
  if (!second.ok) throw new Error("seed failed");
  const third = addEntry(
    second.entries,
    { title: "Afternoon feature", tag: "feature", link: "https://example.com/p" },
    afternoon,
    "c",
  );
  if (!third.ok) throw new Error("seed failed");
  return third.entries;
}

describe("entries", () => {
  it("sorts newest first, including later ships on the same day", () => {
    const shown = visibleEntries(seed(), "all");
    expect(shown.map((entry) => entry.title)).toEqual([
      "Afternoon feature",
      "Morning feature",
      "Older fix",
    ]);
  });

  it("filters by tag and counts the entries shown", () => {
    const features = visibleEntries(seed(), "feature");
    expect(features.map((entry) => entry.tag)).toEqual(["feature", "feature"]);
    expect(countLabel(features.length)).toBe("2 entries");
    expect(countLabel(1)).toBe("1 entry");
    expect(countLabel(visibleEntries(seed(), "docs").length)).toBe("0 entries");
  });

  it("deletes only the chosen entry", () => {
    const remaining = deleteEntry(seed(), "b");
    expect(remaining.map((entry) => entry.id)).toEqual(["a", "c"]);
    expect(deleteEntry(remaining, "missing")).toHaveLength(2);
  });

  it("refuses to add an entry without a title", () => {
    const result = addEntry(seed(), { title: "", tag: "infra" }, afternoon);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("Title is required.");
  });
});
