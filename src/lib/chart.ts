import { escapeHtml, formatUsd } from "./format";
import type { SpendSlice } from "./types";

const WIDTH = 640;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 148;
const VALUE_WIDTH = 118;
const PAD = 8;

export function renderBarChart(slices: SpendSlice[], ariaLabel: string): string {
  const height = Math.max(slices.length, 1) * ROW_HEIGHT + PAD;
  if (slices.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} 48" class="chart" role="img" aria-label="${escapeHtml(ariaLabel)}"><text class="bar-label" x="0" y="28">No spend in this view.</text></svg>`;
  }

  const max = Math.max(...slices.map((slice) => Math.max(slice.costUsd, 0)));
  const barArea = WIDTH - LABEL_WIDTH - VALUE_WIDTH - PAD;
  const bars = slices
    .map((slice, index) => {
      const y = PAD / 2 + index * ROW_HEIGHT;
      const width = max <= 0 ? 0 : (Math.max(slice.costUsd, 0) / max) * barArea;
      return [
        `<text class="bar-label" x="0" y="${y + 22}">${escapeHtml(slice.label)}</text>`,
        `<rect class="bar-track" x="${LABEL_WIDTH}" y="${y + 8}" width="${barArea}" height="16" rx="3"></rect>`,
        `<rect class="bar-fill" width="${width.toFixed(2)}" x="${LABEL_WIDTH}" y="${y + 8}" height="16" rx="3"></rect>`,
        `<text class="bar-value" x="${WIDTH}" y="${y + 22}" text-anchor="end">${formatUsd(slice.costUsd)}</text>`,
      ].join("");
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" class="chart" role="img" aria-label="${escapeHtml(ariaLabel)}">${bars}</svg>`;
}
