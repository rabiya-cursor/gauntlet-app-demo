import { describe, expect, it } from "vitest";
import { renderBarChart } from "./chart";

function fillWidths(svg: string): number[] {
  return [...svg.matchAll(/class="bar-fill" width="([\d.]+)"/g)].map((match) => Number(match[1]));
}

describe("renderBarChart", () => {
  it("draws a wider bar for the larger amount and escapes labels", () => {
    const svg = renderBarChart(
      [
        { label: "EC2 <script>", costUsd: 100 },
        { label: "S3", costUsd: 50 },
      ],
      "Spend by service",
    );
    const [ec2, s3] = fillWidths(svg);
    expect(ec2).toBeCloseTo(s3 * 2);
    expect(svg).toContain("EC2 &lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("$100.00");
    expect(svg).toContain('aria-label="Spend by service"');
  });

  it("renders an empty chart without bars", () => {
    const svg = renderBarChart([], "Spend by team");
    expect(fillWidths(svg)).toEqual([]);
    expect(svg).toContain("No spend in this view.");
  });
});
