import { describe, expect, it } from "vitest";
import type { CostRow } from "./types";
import { weekOverWeek } from "./weekOverWeek";

function row(date: string, costUsd: number, extra: Partial<CostRow> = {}): CostRow {
  return {
    date,
    service: "EC2",
    region: "us-east-1",
    teamTag: "payments",
    costUsd,
    ...extra,
  };
}

describe("weekOverWeek", () => {
  it("sums the last 7 calendar days and the 7 days before them without overlap", () => {
    // Latest date is 2026-03-20, listed first so order does not matter.
    // Current window: 2026-03-14 through 2026-03-20.
    // Previous window: 2026-03-07 through 2026-03-13.
    const rows = [
      row("2026-03-20", 32),
      row("2026-03-06", 1000),
      row("2026-03-07", 1),
      row("2026-03-10", 2),
      row("2026-03-13", 4),
      row("2026-03-14", 8),
      row("2026-03-14", 8, { service: "S3" }),
      row("2026-03-18", 16),
    ];

    expect(weekOverWeek(rows)).toEqual({
      currentUsd: 64,
      previousUsd: 7,
      changeUsd: 57,
      changePct: 57 / 7,
    });

    // Latest 2026-03-03 pulls both windows back across the February boundary.
    // Previous: 2026-02-18 through 2026-02-24. Current: 2026-02-25 through 2026-03-03.
    const acrossMonth = weekOverWeek([
      row("2026-02-17", 100),
      row("2026-02-18", 5),
      row("2026-02-24", 7),
      row("2026-02-25", 11),
      row("2026-03-03", 13),
    ]);
    expect(acrossMonth).toEqual({
      currentUsd: 24,
      previousUsd: 12,
      changeUsd: 12,
      changePct: 1,
    });
  });

  it("returns the fractional change versus the previous window", () => {
    const rows = [row("2026-04-07", 100), row("2026-04-14", 112)];
    expect(weekOverWeek(rows)).toEqual({
      currentUsd: 112,
      previousUsd: 100,
      changeUsd: 12,
      changePct: 0.12,
    });
  });

  it("returns a null percentage when the previous window is zero", () => {
    const rows = [row("2026-05-08", 40), row("2026-05-10", 10)];
    expect(weekOverWeek(rows)).toEqual({
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
