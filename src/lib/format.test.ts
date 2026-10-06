import { describe, expect, it } from "vitest";
import { formatDay, formatPeriod, formatUsd } from "./format";

describe("formatUsd", () => {
  it("formats grouped dollars and cents, including a refund", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(-2)).toBe("-$2.00");
  });
});

describe("formatPeriod", () => {
  it("prints a single day or an inclusive range", () => {
    expect(formatDay("2026-09-01")).toBe("Sep 1, 2026");
    expect(formatPeriod(["2026-09-30", "2026-09-01"])).toBe("Sep 1, 2026 – Sep 30, 2026");
  });
});
