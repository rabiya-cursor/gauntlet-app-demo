import { detectAnomalies } from "./lib/anomalies";
import {
  filterRows,
  formatUsd,
  listRegions,
  listTeams,
  spendByService,
  spendByTeam,
  summarize,
  type Bar,
} from "./lib/aggregate";
import { parseCostCsv } from "./lib/csv";
import { savingsIdeas } from "./lib/savings";
import { ALL, type CostRow } from "./lib/types";

const CSV_KEY = "cost-lens.csv";
const FILTER_KEY = "cost-lens.filters";

type State = {
  rows: CostRow[];
  source: "sample" | "upload";
  error: string | null;
  region: string;
  team: string;
};

const state: State = {
  rows: [],
  source: "sample",
  error: null,
  region: ALL,
  team: ALL,
};

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("Missing #app");
}

void init();

async function init(): Promise<void> {
  app!.innerHTML = `<p class="loading">Loading costs…</p>`;
  restoreFilters();
  const saved = localStorage.getItem(CSV_KEY);
  if (saved) {
    try {
      state.rows = parseCostCsv(saved);
      state.source = "upload";
      render();
      return;
    } catch {
      localStorage.removeItem(CSV_KEY);
      state.error = "Saved CSV could not be read. Loaded the sample file.";
    }
  }
  await loadSample();
}

function restoreFilters(): void {
  const raw = localStorage.getItem(FILTER_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as { region?: unknown; team?: unknown };
    if (typeof parsed.region === "string") state.region = parsed.region;
    if (typeof parsed.team === "string") state.team = parsed.team;
  } catch {
    localStorage.removeItem(FILTER_KEY);
  }
}

async function loadSample(): Promise<void> {
  const response = await fetch("/sample-costs.csv");
  if (!response.ok) {
    state.error = "Could not load sample-costs.csv.";
    state.rows = [];
    render();
    return;
  }
  try {
    state.rows = parseCostCsv(await response.text());
    state.source = "sample";
  } catch (error) {
    state.rows = [];
    state.error = error instanceof Error ? error.message : "Could not parse the sample CSV.";
  }
  render();
}

function render(): void {
  const root = app!;
  clampFilters();
  const view = filterRows(state.rows, { region: state.region, team: state.team });
  const summary = summarize(view);
  const anomalies = detectAnomalies(view);
  const ideas = savingsIdeas(view);
  const regions = listRegions(state.rows);
  const teams = listTeams(state.rows);

  root.innerHTML = `
    <header class="top">
      <div>
        <h1>Cost Lens</h1>
        <p class="lede">AWS spend from a CSV in the browser. No account and no credentials. ${escapeHtml(sourceLabel())}</p>
      </div>
      <div class="controls">
        <label>Region
          <select id="region">${options(regions, state.region)}</select>
        </label>
        <label>Team
          <select id="team">${options(teams, state.team)}</select>
        </label>
        <label class="file">Upload CSV
          <input id="file" type="file" accept=".csv,text/csv" />
        </label>
        <button id="sample" type="button">Use sample</button>
      </div>
    </header>
    ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
    <section class="cards">
      <article class="card">
        <span>Total spend</span>
        <strong>${escapeHtml(formatUsd(summary.totalUsd))}</strong>
        <em>${escapeHtml(periodLabel(summary.periodStart, summary.periodEnd))}</em>
      </article>
      <article class="card">
        <span>Top service</span>
        <strong>${escapeHtml(summary.topService ?? "—")}</strong>
        <em>${summary.topService ? escapeHtml(formatUsd(summary.topServiceUsd)) : "No rows in this view"}</em>
      </article>
      <article class="card">
        <span>Untagged spend</span>
        <strong>${summary.untaggedPct.toFixed(1)}%</strong>
        <em>${escapeHtml(formatUsd(summary.untaggedUsd))}</em>
      </article>
    </section>
    <section class="charts">
      ${barChart("Spend by service", spendByService(view))}
      ${barChart("Spend by team", spendByTeam(view))}
    </section>
    <section class="columns">
      <article class="panel">
        <h2>Anomalies</h2>
        ${
          anomalies.length
            ? `<ul>${anomalies
                .map(
                  (item) => `<li>
                    <strong>${escapeHtml(item.service)}</strong>
                    <span class="meta">${escapeHtml(item.region)} · ${escapeHtml(item.date)}</span>
                    <p>${escapeHtml(formatUsd(item.costUsd))} versus a trailing 7-day average of ${escapeHtml(formatUsd(item.trailingAvgUsd))}
                    <span class="ratio">${item.ratio.toFixed(1)}×</span></p>
                  </li>`,
                )
                .join("")}</ul>`
            : `<p class="empty">No service and region day is above 2× its trailing 7-day average.</p>`
        }
      </article>
      <article class="panel">
        <h2>Savings ideas</h2>
        ${
          ideas.length
            ? `<ul>${ideas
                .map(
                  (idea) => `<li>
                    <strong>${escapeHtml(idea.title)}</strong>
                    <p>${escapeHtml(idea.detail)}</p>
                    <p class="estimate"><small>estimate</small> ${escapeHtml(formatUsd(idea.estimateMonthlyUsd))} / month</p>
                  </li>`,
                )
                .join("")}</ul>`
            : `<p class="empty">None of the savings rules match this view.</p>`
        }
      </article>
    </section>
  `;

  root.querySelector<HTMLSelectElement>("#region")?.addEventListener("change", (event) => {
    state.region = (event.target as HTMLSelectElement).value;
    persistFilters();
    render();
  });
  root.querySelector<HTMLSelectElement>("#team")?.addEventListener("change", (event) => {
    state.team = (event.target as HTMLSelectElement).value;
    persistFilters();
    render();
  });
  root.querySelector<HTMLInputElement>("#file")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void onUpload(file);
  });
  root.querySelector("#sample")?.addEventListener("click", () => {
    localStorage.removeItem(CSV_KEY);
    state.error = null;
    void loadSample();
  });
}

async function onUpload(file: File): Promise<void> {
  const text = await file.text();
  try {
    state.rows = parseCostCsv(text);
    state.source = "upload";
    state.error = null;
    localStorage.setItem(CSV_KEY, text);
    render();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Could not parse that CSV.";
    render();
  }
}

function clampFilters(): void {
  const regions = new Set(listRegions(state.rows));
  const teams = new Set(listTeams(state.rows));
  if (state.region !== ALL && !regions.has(state.region)) state.region = ALL;
  if (state.team !== ALL && !teams.has(state.team)) state.team = ALL;
}

function persistFilters(): void {
  localStorage.setItem(FILTER_KEY, JSON.stringify({ region: state.region, team: state.team }));
}

function sourceLabel(): string {
  if (state.source === "upload") return "Showing an uploaded CSV saved in this browser.";
  return "Showing the bundled 30-day sample.";
}

function periodLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "No dates";
  if (start === end) return start;
  return `${start} – ${end}`;
}

function options(values: string[], selected: string): string {
  const items = [ALL, ...values.filter((value) => value !== ALL)];
  return items
    .map((value) => {
      const label = value === ALL ? "All" : value;
      const isSelected = value === selected ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${isSelected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function barChart(title: string, bars: Bar[]): string {
  const width = 640;
  const labelW = 130;
  const valueW = 92;
  const rowH = 32;
  const height = Math.max(bars.length, 1) * rowH + 8;
  const max = Math.max(...bars.map((bar) => bar.usd), 1);
  const plotW = width - labelW - valueW;
  const body = bars.length
    ? bars
        .map((bar, index) => {
          const y = 6 + index * rowH;
          const barW = (plotW * bar.usd) / max;
          return `<g>
            <text class="bar-label" x="0" y="${y + 16}">${escapeHtml(bar.label)}</text>
            <rect class="bar" x="${labelW}" y="${y + 4}" width="${barW.toFixed(2)}" height="14" rx="3"></rect>
            <text class="bar-value" x="${width}" y="${y + 16}" text-anchor="end">${escapeHtml(formatUsd(bar.usd))}</text>
          </g>`;
        })
        .join("")
    : `<text class="bar-label" x="0" y="20">No spend in this view</text>`;

  return `<article class="panel">
    <h2>${escapeHtml(title)}</h2>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${body}</svg>
  </article>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
