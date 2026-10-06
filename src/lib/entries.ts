export const TAGS = ["feature", "fix", "infra", "docs", "other"] as const;

export type Tag = (typeof TAGS)[number];
export type TagFilter = Tag | "all";

export interface ShipEntry {
  id: string;
  title: string;
  link: string;
  tag: Tag;
  date: string;
  createdAt: number;
}

export interface EntryInput {
  title: string;
  link: string;
  tag: string;
  date?: string;
}

export interface FieldError {
  field: "title" | "link" | "tag" | "date";
  message: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}

export function todayISO(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidISODate(value: string): boolean {
  const match = ISO_DATE.exec(value);
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

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateEntry(
  input: EntryInput,
  now = new Date(),
):
  | { ok: true; value: Pick<ShipEntry, "title" | "link" | "tag" | "date"> }
  | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const title = input.title.trim();
  const link = input.link.trim();
  const date = (input.date ?? "").trim() || todayISO(now);

  if (!title) {
    errors.push({ field: "title", message: "Title is required." });
  }
  if (link && !isHttpUrl(link)) {
    errors.push({
      field: "link",
      message: "Link must be a valid http or https URL.",
    });
  }
  if (!isTag(input.tag)) {
    errors.push({ field: "tag", message: "Pick a valid tag." });
  }
  if (!isValidISODate(date)) {
    errors.push({ field: "date", message: "Date must be a real YYYY-MM-DD." });
  }

  if (errors.length > 0 || !isTag(input.tag)) {
    return { ok: false, errors };
  }

  return { ok: true, value: { title, link, tag: input.tag, date } };
}

export function filterByTag(entries: readonly ShipEntry[], tag: TagFilter): ShipEntry[] {
  if (tag === "all") return [...entries];
  return entries.filter((entry) => entry.tag === tag);
}

export function sortNewestFirst(entries: readonly ShipEntry[]): ShipEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

export function visibleEntries(
  entries: readonly ShipEntry[],
  tag: TagFilter,
): ShipEntry[] {
  return sortNewestFirst(filterByTag(entries, tag));
}

export function shownCount(entries: readonly ShipEntry[], tag: TagFilter): number {
  return filterByTag(entries, tag).length;
}
