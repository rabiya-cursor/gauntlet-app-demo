import { describe, expect, it } from "vitest";
import { applyFilters } from "./aggregate";
import type { CostRow } from "./types";
import { shiftDay, weekOverWeek } from "./weekOverWeek";

function day(date: string, costUsd: number, partial: Partial<CostRow> = {}): CostRow {
  return { date, service: "EC2", region: "us-east-1", teamTag: "payments", costUsd, ...partial };
}

/** One row per day from Sep 1 to Sep 30 with the given cost function. */
function month(costFor: (dayOfMonth: number) => number, partial: Partial<CostRow> = {}): CostRow[] {
  return Array.from({ length: 30 }, (_, index) => {
    const dayOfMonth = index + 1;
    return day(`2026-09-${String(dayOfMonth).padStart(2, "0")}`, costFor(dayOfMonth), partial);
  });
}

describe("shiftDay", () => {
  it("crosses month boundaries", () => {
    expect(shiftDay("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDay("2026-09-30", -13)).toBe("2026-09-17");
  });
});

describe("weekOverWeek", () => {
  it("returns null for no rows", () => {
    expect(weekOverWeek([])).toBeNull();
  });

  it("uses two back-to-back 7-day windows ending on the latest date", () => {
    const result = weekOverWeek(month(() => 10));
    expect(result).toMatchObject({
      currentStart: "2026-09-24",
      currentEnd: "2026-09-30",
      previousStart: "2026-09-17",
      previousEnd: "2026-09-23",
    });
  });

  it("sums each window and ignores older days", () => {
    const result = weekOverWeek(month((d) => (d >= 24 ? 20 : d >= 17 ? 10 : 1000)));
    expect(result?.currentUsd).toBe(140);
    expect(result?.previousUsd).toBe(70);
    expect(result?.changeUsd).toBe(70);
    expect(result?.changePct).toBe(1);
  });

  it("reports flat spend as 0% change", () => {
    expect(weekOverWeek(month(() => 10))?.changePct).toBe(0);
  });

  it("returns a null percentage when the previous window has no spend", () => {
    const result = weekOverWeek([day("2026-09-30", 50)]);
    expect(result?.previousUsd).toBe(0);
    expect(result?.changePct).toBeNull();
  });

  it("respects filters applied before it", () => {
    const rows = [...month(() => 10), ...month(() => 5, { region: "us-west-2" })];
    const filtered = applyFilters(rows, { region: "us-west-2", team: "" });
    expect(weekOverWeek(filtered)?.currentUsd).toBe(35);
  });
});
