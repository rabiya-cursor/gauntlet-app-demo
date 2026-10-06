const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatUsd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const [whole, frac] = Math.abs(amount).toFixed(2).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${withCommas}.${frac}`;
}

export function formatPercent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${ratio.toFixed(1)}×`;
}

export function formatDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1] ?? iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function formatPeriod(dates: string[]): string {
  if (dates.length === 0) return "No dates in this view";
  const sorted = [...dates].sort();
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  if (start === end) return formatDay(start);
  return `${formatDay(start)} – ${formatDay(end)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
