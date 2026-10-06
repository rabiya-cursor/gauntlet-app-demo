import type { CostRow } from "./types";

const REQUIRED = ["date", "service", "region", "team_tag", "cost_usd"] as const;

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

export function parseCostCsv(text: string): CostRow[] {
  const table = parseCsvTable(text);
  if (table.length === 0) throw new CsvParseError("CSV is empty");

  const header = table[0].map((cell) => cell.trim());
  const missing = REQUIRED.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new CsvParseError(`Missing columns: ${missing.join(", ")}`);
  }

  const index = new Map(header.map((column, position) => [column, position]));
  const rows: CostRow[] = [];

  for (let line = 1; line < table.length; line++) {
    const cells = table[line];
    if (cells.every((cell) => cell.trim() === "")) continue;

    const date = readCell(cells, index.get("date"));
    const service = readCell(cells, index.get("service"));
    const region = readCell(cells, index.get("region"));
    const teamTag = readCell(cells, index.get("team_tag"));
    const costRaw = readCell(cells, index.get("cost_usd"));
    const rowNumber = line + 1;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new CsvParseError(`Invalid date on row ${rowNumber}: ${date}`);
    }
    if (!service) throw new CsvParseError(`Missing service on row ${rowNumber}`);
    if (!region) throw new CsvParseError(`Missing region on row ${rowNumber}`);

    const costUsd = Number(costRaw);
    if (!Number.isFinite(costUsd)) {
      throw new CsvParseError(`Invalid cost_usd on row ${rowNumber}: ${costRaw}`);
    }

    rows.push({ date, service, region, teamTag, costUsd });
  }

  return rows;
}

function readCell(cells: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function parseCsvTable(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      pushRow(rows, row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    pushRow(rows, row);
  }

  return rows;
}

function pushRow(rows: string[][], row: string[]): void {
  if (row.length === 1 && row[0] === "") return;
  rows.push(row);
}
