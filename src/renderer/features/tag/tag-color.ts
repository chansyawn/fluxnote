import type { Tag } from "@renderer/clients";

const DEFAULT_TAG_COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#9333EA",
  "#0891B2",
  "#EA580C",
  "#4F46E5",
  "#BE123C",
  "#0F766E",
  "#A16207",
] as const;

type TagColorSource = Pick<Tag, "name"> & Partial<Pick<Tag, "color">>;

export function getDefaultTagColor(name: string): string {
  let hash = 0;
  for (const char of name.trim().toLocaleLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return DEFAULT_TAG_COLORS[hash % DEFAULT_TAG_COLORS.length];
}

export function getTagDisplayColor(tag: TagColorSource): string {
  return tag.color ?? getDefaultTagColor(tag.name);
}
