import type { Anomaly, CostRow } from "./types";

const TRAILING_DAYS = 7;
const SPIKE_RATIO = 2;

/**
 * Flag a service+region day whose cost is more than twice the average of the
 * previous 7 observed days for that same service and region.
 */
export function detectAnomalies(rows: CostRow[]): Anomaly[] {
  const groups = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const key = `${row.service}\0${row.region}`;
    let byDate = groups.get(key);
    if (!byDate) {
      byDate = new Map();
      groups.set(key, byDate);
    }
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.costUsd);
  }

  const anomalies: Anomaly[] = [];

  for (const [key, byDate] of groups) {
    const [service, region] = key.split("\0");
    const dates = [...byDate.keys()].sort();

    for (let index = TRAILING_DAYS; index < dates.length; index++) {
      const window = dates.slice(index - TRAILING_DAYS, index);
      const trailingAverageUsd = window.reduce((total, date) => total + (byDate.get(date) ?? 0), 0) / TRAILING_DAYS;
      const costUsd = byDate.get(dates[index]) ?? 0;
      const spiked = trailingAverageUsd <= 0 ? costUsd > 0 : costUsd > SPIKE_RATIO * trailingAverageUsd;
      if (!spiked) continue;

      anomalies.push({
        date: dates[index],
        service,
        region,
        costUsd,
        trailingAverageUsd,
        ratio: trailingAverageUsd <= 0 ? Number.POSITIVE_INFINITY : costUsd / trailingAverageUsd,
      });
    }
  }

  anomalies.sort((a, b) => b.date.localeCompare(a.date) || b.ratio - a.ratio || a.service.localeCompare(b.service));
  return anomalies;
}
