import type { EntryDraft, ShipEntry, Tag } from "./types";
import { validateDraft } from "./validate";

export type TagFilter = Tag | "all";

export type AddResult =
  | { ok: true; entries: ShipEntry[] }
  | { ok: false; errors: string[] };

export function sortNewestFirst(entries: ShipEntry[]): ShipEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterByTag(entries: ShipEntry[], tag: TagFilter): ShipEntry[] {
  if (tag === "all") return entries;
  return entries.filter((entry) => entry.tag === tag);
}

export function visibleEntries(entries: ShipEntry[], tag: TagFilter): ShipEntry[] {
  return sortNewestFirst(filterByTag(entries, tag));
}

export function countLabel(count: number): string {
  return count === 1 ? "1 entry" : `${count} entries`;
}

export function deleteEntry(entries: ShipEntry[], id: string): ShipEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

function nextCreatedAt(entries: ShipEntry[], now: Date): string {
  let stamp = now.getTime();
  const taken = new Set(entries.map((entry) => entry.createdAt));
  let createdAt = new Date(stamp).toISOString();
  while (taken.has(createdAt)) {
    stamp += 1;
    createdAt = new Date(stamp).toISOString();
  }
  return createdAt;
}

export function addEntry(
  entries: ShipEntry[],
  draft: EntryDraft,
  now = new Date(),
  id = `entry-${now.getTime()}-${entries.length + 1}`,
): AddResult {
  const validated = validateDraft(draft, now);
  if (!validated.ok) return validated;

  const entry: ShipEntry = {
    ...validated.value,
    id,
    createdAt: nextCreatedAt(entries, now),
  };
  return { ok: true, entries: [...entries, entry] };
}
