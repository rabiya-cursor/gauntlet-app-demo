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
  it("uses non-overlapping calendar windows ending on the latest date", () => {
    // Latest is Mar 10. Current is Mar 4–10. Previous is Feb 25–Mar 3.
    // Feb 24 sits one day before the previous window and must be excluded.
    const comparison = weekOverWeek([
      row("2026-02-24", 100),
      row("2026-02-25", 10),
      row("2026-03-03", 20),
      row("2026-03-04", 30),
      row("2026-03-04", 5),
      row("2026-03-10", 40),
    ]);

    expect(comparison).toEqual({
      currentUsd: 75,
      previousUsd: 30,
      changeUsd: 45,
      changePct: 1.5,
    });
  });

  it("reports the change as a fraction of the previous window", () => {
    const comparison = weekOverWeek([row("2026-01-01", 100), row("2026-01-08", 112)]);
    expect(comparison).toEqual({
      currentUsd: 112,
      previousUsd: 100,
      changeUsd: 12,
      changePct: 0.12,
    });
  });

  it("returns a null percentage when the previous window is zero", () => {
    const comparison = weekOverWeek([row("2026-04-14", 50)]);
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
