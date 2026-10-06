import { filterRows, spendBy, summarize, type SpendBar } from "./lib/aggregate";
import { detectAnomalies } from "./lib/anomalies";
import { parseCostCsv } from "./lib/csv";
import { savingsIdeas } from "./lib/savings";
import { UNTAGGED_TEAM, type CostRow, type Filters } from "./lib/types";

const FILTERS_KEY = "cost-lens-filters";
const CSV_KEY = "cost-lens-csv";
const CSV_NAME_KEY = "cost-lens-csv-name";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing #app");
const app: HTMLDivElement = root;

let allRows: CostRow[] = [];
let sourceLabel = "Sample data";
let filters: Filters = loadFilters();

function loadFilters(): Filters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return { region: "", team: "" };
    const parsed = JSON.parse(raw) as Partial<Filters>;
    return {
      region: typeof parsed.region === "string" ? parsed.region : "",
      team: typeof parsed.team === "string" ? parsed.team : "",
    };
  } catch {
    return { region: "", team: "" };
  }
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function periodLabel(rows: CostRow[]): string {
  if (rows.length === 0) return "No rows in this view";
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  return `${formatDay(dates[0])} – ${formatDay(dates[dates.length - 1])}`;
}

function option(value: string, label: string, current: string): string {
  const selected = value === current ? " selected" : "";
  return `<option value="${esc(value)}"${selected}>${esc(label)}</option>`;
}

function barChart(title: string, items: SpendBar[]): string {
  if (items.length === 0) {
    return `<p class="empty">No spend in this view.</p>`;
  }

  const rowHeight = 28;
  const labelWidth = 118;
  const valueWidth = 96;
  const width = 640;
  const height = items.length * rowHeight + 4;
  const max = Math.max(...items.map((item) => item.cost));
  const barWidth = width - labelWidth - valueWidth - 16;
  const bars = items
    .map((item, index) => {
      const y = index * rowHeight;
      const widthPx = max === 0 ? 0 : (item.cost / max) * barWidth;
      return `<text x="0" y="${y + 18}">${esc(item.label)}</text>
        <rect class="track" x="${labelWidth}" y="${y + 6}" width="${barWidth}" height="14" rx="4"></rect>
        <rect class="fill" x="${labelWidth}" y="${y + 6}" width="${widthPx.toFixed(2)}" height="14" rx="4"></rect>
        <text class="muted" x="${labelWidth + barWidth + 8}" y="${y + 18}">${esc(formatUsd(item.cost))}</text>`;
    })
    .join("");

  return `<svg class="chart" role="img" aria-label="${esc(title)}" viewBox="0 0 ${width} ${height}" width="100%">${bars}</svg>`;
}

function render(errors: string[] = []): void {
  const rows = filterRows(allRows, filters);
  const summary = summarize(rows);
  const byService = spendBy(rows, "service");
  const byTeam = spendBy(rows, "teamTag");
  const anomalies = detectAnomalies(rows);
  const ideas = savingsIdeas(rows);
  const regions = [...new Set(allRows.map((row) => row.region))].sort();
  const teams = [...new Set(allRows.map((row) => row.teamTag).filter(Boolean))].sort();

  const shownErrors = errors.slice(0, 8);
  const extraErrors = errors.length - shownErrors.length;
  const errorHtml =
    errors.length === 0
      ? ""
      : `<div class="banner" role="alert">
          <p>That CSV was not applied.</p>
          <ul>${shownErrors.map((error) => `<li>${esc(error)}</li>`).join("")}</ul>
          ${extraErrors > 0 ? `<p>${extraErrors} more.</p>` : ""}
        </div>`;

  const anomalyRows =
    anomalies.length === 0
      ? `<p class="empty">No service and region day was more than twice its trailing 7-day average.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Date</th><th>Service</th><th>Region</th><th>Cost</th><th>7-day avg</th><th>Multiple</th>
            </tr>
          </thead>
          <tbody>
            ${anomalies
              .map(
                (item) => `<tr>
                  <td>${esc(item.date)}</td>
                  <td>${esc(item.service)}</td>
                  <td>${esc(item.region)}</td>
                  <td>${esc(formatUsd(item.costUsd))}</td>
                  <td>${esc(formatUsd(item.trailingAvg))}</td>
                  <td>${item.ratio.toFixed(1)}×</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

  const ideaHtml =
    ideas.length === 0
      ? `<p class="empty">No savings rules matched this view.</p>`
      : ideas
          .map(
            (idea) => `<article class="idea">
              <h3>${esc(idea.title)}</h3>
              <p>${esc(idea.detail)}</p>
              <p class="estimate"><span>estimate</span> ${esc(formatUsd(idea.estimateMonthlyUsd))} / month</p>
            </article>`,
          )
          .join("");

  const top = summary.topService
    ? `${esc(summary.topService.name)}`
    : "—";
  const topHint = summary.topService ? formatUsd(summary.topService.cost) : "No spend";

  app.innerHTML = `
    ${errorHtml}
    <header>
      <div>
        <p class="eyebrow">AWS cost dashboard</p>
        <h1>Cost Lens</h1>
        <p class="sub">${esc(sourceLabel)} · ${esc(periodLabel(rows))}. Stays in this browser.</p>
      </div>
      <div class="actions">
        <label class="file">Upload CSV
          <input id="csv-file" type="file" accept=".csv,text/csv" />
        </label>
        <button id="reset" type="button">Use sample</button>
      </div>
    </header>
    <div class="filters">
      <label>Region
        <select id="region">
          ${option("", "All regions", filters.region)}
          ${regions.map((region) => option(region, region, filters.region)).join("")}
        </select>
      </label>
      <label>Team
        <select id="team">
          ${option("", "All teams", filters.team)}
          ${teams.map((team) => option(team, team, filters.team)).join("")}
          ${option(UNTAGGED_TEAM, "Untagged", filters.team)}
        </select>
      </label>
    </div>
    <section class="cards">
      <article class="card">
        <h2>Total spend</h2>
        <p class="metric">${esc(formatUsd(summary.total))}</p>
        <p class="hint">${summary.dayCount} days</p>
      </article>
      <article class="card">
        <h2>Top service</h2>
        <p class="metric">${top}</p>
        <p class="hint">${esc(topHint)}</p>
      </article>
      <article class="card">
        <h2>Untagged</h2>
        <p class="metric">${summary.untaggedPct.toFixed(1)}%</p>
        <p class="hint">${esc(formatUsd(summary.untaggedCost))}</p>
      </article>
    </section>
    <section class="charts">
      <article class="panel">
        <h2>Spend by service</h2>
        ${barChart("Spend by service", byService)}
      </article>
      <article class="panel">
        <h2>Spend by team</h2>
        ${barChart("Spend by team", byTeam)}
      </article>
    </section>
    <section class="lists">
      <article class="panel">
        <h2>Anomalies</h2>
        ${anomalyRows}
      </article>
      <article class="panel">
        <h2>Savings ideas</h2>
        ${ideaHtml}
      </article>
    </section>
  `;

  bind();
}

function bind(): void {
  document.querySelector<HTMLSelectElement>("#region")?.addEventListener("change", (event) => {
    filters = { ...filters, region: (event.target as HTMLSelectElement).value };
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    render();
  });

  document.querySelector<HTMLSelectElement>("#team")?.addEventListener("change", (event) => {
    filters = { ...filters, team: (event.target as HTMLSelectElement).value };
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    render();
  });

  document.querySelector<HTMLInputElement>("#csv-file")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCostCsv(text);
    if (parsed.errors.length > 0 || parsed.rows.length === 0) {
      render(parsed.errors.length > 0 ? parsed.errors : ["CSV has no cost rows."]);
      return;
    }
    allRows = parsed.rows;
    sourceLabel = file.name;
    localStorage.setItem(CSV_KEY, text);
    localStorage.setItem(CSV_NAME_KEY, file.name);
    render();
  });

  document.querySelector<HTMLButtonElement>("#reset")?.addEventListener("click", () => {
    localStorage.removeItem(CSV_KEY);
    localStorage.removeItem(CSV_NAME_KEY);
    void loadSample();
  });
}

async function loadSample(): Promise<void> {
  try {
    const response = await fetch("/sample-costs.csv");
    if (!response.ok) throw new Error(`Sample CSV returned ${response.status}.`);
    const parsed = parseCostCsv(await response.text());
    if (parsed.errors.length > 0) {
      render(parsed.errors);
      return;
    }
    allRows = parsed.rows;
    sourceLabel = "Sample data";
    render();
  } catch (error) {
    render([error instanceof Error ? error.message : "Could not load the sample CSV."]);
  }
}

async function init(): Promise<void> {
  const saved = localStorage.getItem(CSV_KEY);
  if (saved) {
    const parsed = parseCostCsv(saved);
    if (parsed.errors.length === 0 && parsed.rows.length > 0) {
      allRows = parsed.rows;
      sourceLabel = localStorage.getItem(CSV_NAME_KEY) || "Uploaded CSV";
      render();
      return;
    }
    localStorage.removeItem(CSV_KEY);
    localStorage.removeItem(CSV_NAME_KEY);
  }
  await loadSample();
}

void init();
