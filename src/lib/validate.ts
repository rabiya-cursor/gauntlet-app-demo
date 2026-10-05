import { isTag, type EntryDraft, type ShipEntry, type Tag } from "./types";

export type ValidEntry = Omit<ShipEntry, "id" | "createdAt">;

export type ValidationResult =
  | { ok: true; value: ValidEntry }
  | { ok: false; errors: string[] };

export function todayISO(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateDraft(draft: EntryDraft, now = new Date()): ValidationResult {
  const errors: string[] = [];
  const title = draft.title.trim();
  if (!title) errors.push("Title is required.");

  const link = (draft.link ?? "").trim();
  if (link && !isHttpUrl(link)) {
    errors.push("Link must be a valid http or https URL.");
  }

  if (!isTag(draft.tag)) {
    errors.push("Tag must be feature, fix, infra, docs, or other.");
  }

  const date = (draft.date ?? "").trim() || todayISO(now);
  if (!isValidISODate(date)) {
    errors.push("Date must be a valid calendar date.");
  }

  if (errors.length > 0 || !isTag(draft.tag)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { title, link, tag: draft.tag as Tag, date },
  };
}
