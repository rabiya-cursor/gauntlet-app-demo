import type { CostRow } from "./types";

const REQUIRED = ["date", "service", "region", "team_tag", "cost_usd"] as const;

export type ParseResult = {
  rows: CostRow[];
  errors: string[];
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isIsoDate(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

export function parseCostCsv(text: string): ParseResult {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const nonEmpty = cleaned
    .split("\n")
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((entry) => entry.line.length > 0);

  if (nonEmpty.length === 0) {
    return { rows: [], errors: ["CSV is empty."] };
  }

  const header = splitCsvLine(nonEmpty[0].line).map((cell) => cell.trim());
  const indexOf = new Map(header.map((name, index) => [name, index]));
  const missing = REQUIRED.filter((name) => !indexOf.has(name));
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing columns: ${missing.join(", ")}.`] };
  }

  const rows: CostRow[] = [];
  const errors: string[] = [];

  for (const { line, lineNumber } of nonEmpty.slice(1)) {
    const cells = splitCsvLine(line);
    const value = (name: (typeof REQUIRED)[number]) => (cells[indexOf.get(name)!] ?? "").trim();
    const date = value("date");
    const service = value("service");
    const region = value("region");
    const teamTag = value("team_tag");
    const costRaw = value("cost_usd");
    const rowErrors: string[] = [];

    if (!isIsoDate(date)) rowErrors.push("date must be YYYY-MM-DD");
    if (!service) rowErrors.push("service is required");
    if (!region) rowErrors.push("region is required");

    const costUsd = Number(costRaw);
    if (costRaw === "" || !Number.isFinite(costUsd) || costUsd < 0) {
      rowErrors.push("cost_usd must be a non-negative number");
    }

    if (rowErrors.length > 0) {
      errors.push(`Line ${lineNumber}: ${rowErrors.join(", ")}.`);
      continue;
    }

    rows.push({ date, service, region, teamTag, costUsd });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("CSV has a header but no data rows.");
  }

  return { rows, errors };
}
