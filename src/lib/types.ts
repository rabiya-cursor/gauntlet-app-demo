export const TAGS = ["feature", "fix", "infra", "docs", "other"] as const;

export type Tag = (typeof TAGS)[number];

export type ShipEntry = {
  id: string;
  title: string;
  link: string;
  tag: Tag;
  date: string;
  createdAt: string;
};

export type EntryDraft = {
  title: string;
  link?: string;
  tag: string;
  date?: string;
};

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}
