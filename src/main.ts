import "./style.css";
import { applyFilters, spendByService, spendByTeam, summarize } from "./lib/aggregate";
import { detectAnomalies } from "./lib/anomalies";
import { renderBarChart } from "./lib/chart";
import { CsvParseError, parseCostCsv } from "./lib/csv";
import { formatDay, formatPercent, formatPeriod, formatRatio, formatUsd } from "./lib/format";
import { savingsIdeas } from "./lib/savings";
import { clearUploadedCsv, loadFilters, loadUploadedCsv, saveFilters, saveUploadedCsv } from "./lib/storage";
import { ALL, UNTAGGED, type CostRow, type Filters } from "./lib/types";
import { weekOverWeek } from "./lib/weekOverWeek";

const appRoot = document.querySelector<HTMLElement>("#app");
if (!appRoot) throw new Error("Missing #app");
const app: HTMLElement = appRoot;

let rows: CostRow[] = [];
let sampleRows: CostRow[] = [];
let filters: Filters = { region: ALL, team: ALL };
let source: "sample" | "upload" = "sample";
let error = "";
let loading = true;

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".csv,text/csv";
fileInput.hidden = true;
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  void file.text().then((text) => {
    try {
      const parsed = parseCostCsv(text);
      if (parsed.length === 0) throw new CsvParseError("CSV has no data rows");
      rows = parsed;
      source = "upload";
      filters = { region: ALL, team: ALL };
      saveUploadedCsv(localStorage, text);
      saveFilters(localStorage, filters);
      error = "";
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Could not read that CSV";
    }
    render();
  });
});

void boot();

async function boot(): Promise<void> {
  try {
    const response = await fetch("/sample-costs.csv");
    if (!response.ok) throw new Error(`Sample CSV failed to load (${response.status})`);
    sampleRows = parseCostCsv(await response.text());
    const stored = loadUploadedCsv(localStorage);
    if (stored) {
      try {
        rows = parseCostCsv(stored);
        source = "upload";
      } catch {
        clearUploadedCsv(localStorage);
        rows = sampleRows;
        source = "sample";
      }
    } else {
      rows = sampleRows;
    }
    filters = sanitizeFilters(rows, loadFilters(localStorage));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load costs";
  } finally {
    loading = false;
    render();
  }
}

function render(): void {
  app.replaceChildren();
  const filtered = applyFilters(rows, filters);
  const summary = summarize(filtered);
  const services = spendByService(filtered);
  const teams = spendByTeam(filtered);
  const anomalies = detectAnomalies(filtered);
  const ideas = savingsIdeas(filtered);
  const wow = weekOverWeek(filtered);

  const masthead = document.createElement("header");
  masthead.className = "masthead";
  const brand = document.createElement("div");
  brand.className = "brand";
  const mark = document.createElement("div");
  mark.className = "mark";
  mark.textContent = "CL";
  const titles = document.createElement("div");
  const heading = document.createElement("h1");
  heading.textContent = "Cost Lens";
  const lede = document.createElement("p");
  lede.className = "lede";
  lede.textContent = "AWS spend for the period in front of you. Parsed in this browser. No credentials leave the machine.";
  titles.append(heading, lede);
  brand.append(mark, titles);

  const actions = document.createElement("div");
  actions.className = "actions";
  const upload = document.createElement("button");
  upload.type = "button";
  upload.textContent = "Upload CSV";
  upload.addEventListener("click", () => fileInput.click());
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "secondary";
  reset.textContent = "Use sample";
  reset.addEventListener("click", () => {
    clearUploadedCsv(localStorage);
    rows = sampleRows;
    source = "sample";
    filters = sanitizeFilters(rows, { region: ALL, team: ALL });
    saveFilters(localStorage, filters);
    error = "";
    render();
  });
  actions.append(upload, reset, fileInput);
  masthead.append(brand, actions);

  const filterBar = document.createElement("div");
  filterBar.className = "filters";
  filterBar.append(
    selectField("Region", filters.region, regionOptions(rows), (region) => updateFilters({ ...filters, region })),
    selectField("Team", filters.team, teamOptions(rows), (team) => updateFilters({ ...filters, team })),
  );
  const period = document.createElement("p");
  period.className = "period";
  period.textContent = loading
    ? "Loading sample costs…"
    : `${formatPeriod(filtered.map((row) => row.date))} · ${source === "sample" ? "Sample data" : "Uploaded CSV"}`;
  filterBar.append(period);

  const cards = document.createElement("section");
  cards.className = "cards";
  cards.setAttribute("aria-label", "Summary");
  const topShare = summary.totalUsd === 0 ? 0 : summary.topServiceUsd / summary.totalUsd;
  cards.append(
    card(
      "Total spend",
      formatUsd(summary.totalUsd),
      summary.dayCount === 0 ? "Nothing matches these filters" : `${summary.dayCount} day${summary.dayCount === 1 ? "" : "s"} in view`,
    ),
    card(
      "Top service",
      summary.topService ?? "—",
      summary.topService ? `${formatUsd(summary.topServiceUsd)} · ${formatPercent(topShare)} of this view` : "No services in this view",
    ),
    card(
      "Untagged",
      formatPercent(summary.untaggedShare),
      `${formatUsd(summary.untaggedUsd)} with an empty team tag`,
    ),
    card("Last 7 days", wow ? formatUsd(wow.currentUsd) : "—", weekOverWeekNote(wow)),
  );

  const charts = document.createElement("div");
  charts.className = "grid";
  charts.append(
    panel("Spend by service", "Each bar is that service’s total in the current filters.", renderBarChart(services, "Spend by service")),
    panel("Spend by team", "Empty team tags are grouped as Untagged.", renderBarChart(teams, "Spend by team"), "team-chart"),
  );

  const lower = document.createElement("div");
  lower.className = "grid";
  lower.append(anomalyPanel(anomalies), savingsPanel(ideas));

  app.append(masthead, filterBar);
  if (error) {
    const banner = document.createElement("p");
    banner.className = "banner";
    banner.textContent = error;
    app.append(banner);
  }
  app.append(cards, charts, lower);
}

function updateFilters(next: Filters): void {
  filters = next;
  saveFilters(localStorage, filters);
  render();
}

function sanitizeFilters(data: CostRow[], current: Filters): Filters {
  const regions = new Set(data.map((row) => row.region));
  const teams = new Set(data.map((row) => row.teamTag));
  const region = current.region && regions.has(current.region) ? current.region : ALL;
  let team = current.team;
  if (team === UNTAGGED) team = [...teams].some((value) => value === "") ? UNTAGGED : ALL;
  else if (team && !teams.has(team)) team = ALL;
  return { region, team };
}

function regionOptions(data: CostRow[]): Array<[string, string]> {
  const regions = [...new Set(data.map((row) => row.region))].sort();
  return [["All regions", ALL], ...regions.map((region) => [region, region] as [string, string])];
}

function teamOptions(data: CostRow[]): Array<[string, string]> {
  const named = [...new Set(data.map((row) => row.teamTag).filter((team) => team !== ""))].sort();
  const options: Array<[string, string]> = [["All teams", ALL], ...named.map((team) => [team, team] as [string, string])];
  if (data.some((row) => row.teamTag === "")) options.push(["Untagged", UNTAGGED]);
  return options;
}

function selectField(labelText: string, value: string, options: Array<[string, string]>, onChange: (value: string) => void): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  for (const [text, optionValue] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = text;
    select.append(option);
  }
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  label.append(select);
  return label;
}

function weekOverWeekNote(wow: ReturnType<typeof weekOverWeek>): string {
  if (!wow) return "Nothing matches these filters";
  const sign = wow.changeUsd > 0 ? "+" : "";
  const pct = wow.changePct === null ? "new spend" : `${sign}${formatPercent(wow.changePct)}`;
  return `${sign}${formatUsd(wow.changeUsd)} (${pct}) vs previous 7 days`;
}

function card(kicker: string, value: string, note: string): HTMLElement {
  const article = document.createElement("article");
  article.className = "card";
  const k = document.createElement("p");
  k.className = "kicker";
  k.textContent = kicker;
  const v = document.createElement("p");
  v.className = "card-value";
  v.textContent = value;
  const n = document.createElement("p");
  n.className = "card-note";
  n.textContent = note;
  article.append(k, v, n);
  return article;
}

function panel(title: string, note: string, svg: string, extraClass = ""): HTMLElement {
  const section = document.createElement("section");
  section.className = `panel ${extraClass}`.trim();
  const heading = document.createElement("h2");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.className = "section-note";
  copy.textContent = note;
  const host = document.createElement("div");
  host.innerHTML = svg;
  section.append(heading, copy, host);
  return section;
}

function anomalyPanel(anomalies: ReturnType<typeof detectAnomalies>): HTMLElement {
  const section = document.createElement("section");
  section.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = "Anomalies";
  const note = document.createElement("p");
  note.className = "section-note";
  note.textContent = "A service and region on a day that cost more than twice its previous 7 days.";
  section.append(heading, note);

  if (anomalies.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No service-region day exceeded 2× its trailing 7-day average.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "list";
  for (const anomaly of anomalies) {
    const item = document.createElement("li");
    item.className = "anomaly";
    const left = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = anomaly.service;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${anomaly.region} · ${formatDay(anomaly.date)}`;
    left.append(name, meta);
    const right = document.createElement("div");
    const ratio = document.createElement("span");
    ratio.className = "ratio";
    ratio.textContent = formatRatio(anomaly.ratio);
    const compare = document.createElement("span");
    compare.className = "meta";
    compare.textContent = `${formatUsd(anomaly.costUsd)} vs ${formatUsd(anomaly.trailingAverageUsd)} avg`;
    right.append(ratio, compare);
    item.append(left, right);
    list.append(item);
  }
  section.append(list);
  return section;
}

function savingsPanel(ideas: ReturnType<typeof savingsIdeas>): HTMLElement {
  const section = document.createElement("section");
  section.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = "Savings ideas";
  const note = document.createElement("p");
  note.className = "section-note";
  note.textContent = "Rules on the filtered rows. Each figure is scaled to 30 days and labeled estimate.";
  section.append(heading, note);

  if (ideas.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No savings rules matched this view.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "list";
  for (const idea of ideas) {
    const item = document.createElement("li");
    item.className = "idea";
    const title = document.createElement("h3");
    title.textContent = idea.title;
    const detail = document.createElement("p");
    detail.className = "meta";
    detail.textContent = idea.detail;
    const estimate = document.createElement("p");
    estimate.className = "estimate";
    const label = document.createElement("span");
    label.className = "estimate-label";
    label.textContent = "estimate";
    estimate.append(label, document.createTextNode(`${formatUsd(idea.estimateMonthlyUsd)} / month`));
    item.append(title, detail, estimate);
    list.append(item);
  }
  section.append(list);
  return section;
}
