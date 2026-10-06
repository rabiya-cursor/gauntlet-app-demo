import type { CostRow } from "./types";

export type Anomaly = {
  date: string;
  service: string;
  region: string;
  costUsd: number;
  trailingAvg: number;
  ratio: number;
};

const SERIES_SEP = "\u0000";

function shiftIsoDate(iso: string, deltaDays: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return date.toISOString().slice(0, 10);
}

export function detectAnomalies(rows: CostRow[], multiple = 2, windowDays = 7): Anomaly[] {
  const series = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = `${row.service}${SERIES_SEP}${row.region}`;
    let days = series.get(key);
    if (!days) {
      days = new Map();
      series.set(key, days);
    }
    days.set(row.date, (days.get(row.date) ?? 0) + row.costUsd);
  }

  const anomalies: Anomaly[] = [];
  for (const [key, days] of series) {
    const [service, region] = key.split(SERIES_SEP);
    for (const date of [...days.keys()].sort()) {
      const prior: number[] = [];
      for (let offset = windowDays; offset >= 1; offset--) {
        const value = days.get(shiftIsoDate(date, -offset));
        // A partial window makes the first week, and any gap, look like a spike.
        if (value === undefined) {
          prior.length = 0;
          break;
        }
        prior.push(value);
      }
      if (prior.length !== windowDays) continue;

      const trailingAvg = prior.reduce((sum, value) => sum + value, 0) / windowDays;
      const costUsd = days.get(date) ?? 0;
      if (costUsd > trailingAvg * multiple) {
        anomalies.push({
          date,
          service,
          region,
          costUsd,
          trailingAvg,
          ratio: trailingAvg === 0 ? Infinity : costUsd / trailingAvg,
        });
      }
    }
  }

  anomalies.sort(
    (a, b) => a.date.localeCompare(b.date) || b.ratio - a.ratio || a.service.localeCompare(b.service),
  );
  return anomalies;
}
