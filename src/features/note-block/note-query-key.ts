import type { BlockVisibility } from "@/clients";

export const blockListQueryKey = (tagIds: string[], visibility: BlockVisibility) =>
  ["blocks", visibility, [...tagIds].sort((left, right) => left.localeCompare(right))] as const;

export const tagListQueryKey = ["tags"] as const;
