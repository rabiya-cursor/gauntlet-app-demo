import type { CostRow } from "./types";

const TRAILING_DAYS = 7;
const SPIKE_RATIO = 2;

export type Anomaly = {
  date: string;
  service: string;
  region: string;
  costUsd: number;
  trailingAvgUsd: number;
  ratio: number;
};

type DailyCost = {
  date: string;
  costUsd: number;
};

export function detectAnomalies(rows: CostRow[]): Anomaly[] {
  const seriesByKey = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const key = `${row.service}\0${row.region}`;
    let byDate = seriesByKey.get(key);
    if (!byDate) {
      byDate = new Map();
      seriesByKey.set(key, byDate);
    }
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.costUsd);
  }

  const anomalies: Anomaly[] = [];
  for (const [key, byDate] of seriesByKey) {
    const [service, region] = key.split("\0");
    const series = [...byDate.entries()]
      .map(([date, costUsd]) => ({ date, costUsd }))
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < series.length; i++) {
      const trailingAvgUsd = priorSevenDayAverage(series, i);
      if (trailingAvgUsd === null || trailingAvgUsd <= 0) continue;
      const ratio = series[i].costUsd / trailingAvgUsd;
      if (ratio > SPIKE_RATIO) {
        anomalies.push({
          date: series[i].date,
          service,
          region,
          costUsd: series[i].costUsd,
          trailingAvgUsd,
          ratio,
        });
      }
    }
  }

  anomalies.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      b.ratio - a.ratio ||
      a.service.localeCompare(b.service) ||
      a.region.localeCompare(b.region),
  );
  return anomalies;
}

function priorSevenDayAverage(series: DailyCost[], index: number): number | null {
  // Only the previous 7 calendar days count. A longer gap drops the window
  // so a later day is not compared with a stale baseline.
  const current = utcDay(series[index].date);
  if (current === null) return null;

  let sum = 0;
  let count = 0;
  for (let j = index - 1; j >= 0; j--) {
    const previous = utcDay(series[j].date);
    if (previous === null) continue;
    const gap = Math.round((current - previous) / 86_400_000);
    if (gap > TRAILING_DAYS) break;
    if (gap < 1) continue;
    sum += series[j].costUsd;
    count += 1;
  }

  if (count < TRAILING_DAYS) return null;
  return sum / TRAILING_DAYS;
}

function utcDay(isoDate: string): number | null {
  const time = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}
