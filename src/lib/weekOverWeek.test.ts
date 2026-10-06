import { describe, expect, it } from "vitest";
import type { CostRow } from "./types";
import { weekOverWeek } from "./weekOverWeek";

function row(date: string, costUsd: number): CostRow {
  return {
    date,
    service: "EC2",
    region: "us-east-1",
    teamTag: "payments",
    costUsd,
  };
}

describe("weekOverWeek", () => {
  it("uses non-overlapping 7-day calendar windows ending on the latest date", () => {
    const comparison = weekOverWeek([
      row("2026-09-16", 1000),
      row("2026-09-17", 10),
      row("2026-09-23", 20),
      row("2026-09-24", 30),
      row("2026-09-30", 40),
      row("2026-09-30", 5),
    ]);

    expect(comparison).toEqual({
      currentUsd: 75,
      previousUsd: 30,
      changeUsd: 45,
      changePct: 45 / 30,
    });
  });

  it("crosses month boundaries without pulling in the day before the previous window", () => {
    const comparison = weekOverWeek([
      row("2026-02-15", 9),
      row("2026-02-16", 1),
      row("2026-02-22", 2),
      row("2026-02-23", 4),
      row("2026-03-01", 8),
    ]);

    expect(comparison).toMatchObject({
      currentUsd: 12,
      previousUsd: 3,
      changeUsd: 9,
    });
  });

  it("returns the change as a fraction of the previous window", () => {
    const comparison = weekOverWeek([row("2026-09-23", 100), row("2026-09-30", 112)]);
    expect(comparison?.changeUsd).toBe(12);
    expect(comparison?.changePct).toBeCloseTo(0.12);
  });

  it("returns a null percentage when the previous window is zero", () => {
    const comparison = weekOverWeek([row("2026-09-30", 50)]);
    expect(comparison).toEqual({
      currentUsd: 50,
      previousUsd: 0,
      changeUsd: 50,
      changePct: null,
    });
  });

  it("returns null when there are no rows", () => {
    expect(weekOverWeek([])).toBeNull();
  });
});
