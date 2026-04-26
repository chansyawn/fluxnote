import type { BlockVisibility } from "@renderer/clients";

export const BLOCKS_PAGE_SIZE = 10;

export const blockListQueryKey = (tagIds: string[], visibility: BlockVisibility) =>
  ["blocks", visibility, [...tagIds].sort((left, right) => left.localeCompare(right))] as const;

export const blockListPageQueryKey = (
  tagIds: string[],
  visibility: BlockVisibility,
  offset: number,
) => [...blockListQueryKey(tagIds, visibility), "page", offset] as const;

export const getBlockPageOffset = (index: number) =>
  Math.floor(index / BLOCKS_PAGE_SIZE) * BLOCKS_PAGE_SIZE;

export const tagListQueryKey = ["tags"] as const;
