import type { CostRow } from "./types";

const REQUIRED = ["date", "service", "region", "team_tag", "cost_usd"] as const;

export function parseCostCsv(text: string): CostRow[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) {
    throw new Error("CSV is empty");
  }

  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== "");
  const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const index = new Map(header.map((name, i) => [name, i]));

  for (const column of REQUIRED) {
    if (!index.has(column)) {
      throw new Error(`Missing column: ${column}`);
    }
  }

  const rows: CostRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const date = field(cells, index.get("date"));
    const service = field(cells, index.get("service"));
    const region = field(cells, index.get("region"));
    const teamTag = field(cells, index.get("team_tag"));
    const costRaw = field(cells, index.get("cost_usd"));
    const lineNo = i + 1;

    if (!date || !service || !region) {
      throw new Error(`Row ${lineNo} is missing date, service, or region`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Row ${lineNo} has an invalid date`);
    }
    const costUsd = Number(costRaw);
    if (!Number.isFinite(costUsd)) {
      throw new Error(`Row ${lineNo} has an invalid cost_usd`);
    }

    rows.push({ date, service, region, teamTag, costUsd });
  }

  if (rows.length === 0) {
    throw new Error("CSV has no data rows");
  }

  return rows;
}

export function parseCsvLine(line: string): string[] {
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
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function field(cells: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return cells[index] ?? "";
}
