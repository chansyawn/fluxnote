import { queryClient } from "@renderer/app/query";
import {
  listBlocks,
  locateBlock,
  type Block,
  type BlockVisibility,
  type ListBlocksRequest,
  type ListBlocksResult,
  type LocateBlockResult,
} from "@renderer/clients";
import { BLOCKS_QUERY_KEY, refreshBlocks } from "@renderer/features/blocks/block-query";
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

const BLOCKS_PAGE_SIZE = 10;

export interface WorkspaceBlockView {
  tagIds: string[];
  visibility: BlockVisibility;
}

export interface WorkspaceBlockCollection {
  totalBlockCount: number;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndex: (index: number) => void;
  ensureBlockRange: (startIndex: number, endIndex: number) => void;
  ensureBlockIndexLoaded: (
    index: number,
    options?: { refresh?: boolean },
  ) => Promise<Block | undefined>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  refresh: () => void;
  patchBlock: (block: Block) => void;
  getCachedBlock: (blockId: string) => Block | undefined;
}

export function normalizeWorkspaceBlockView({ tagIds, visibility }: WorkspaceBlockView) {
  return {
    tagIds: [...tagIds].sort((left, right) => left.localeCompare(right)),
    visibility,
  };
}

export function workspaceBlockListQueryKey(view: WorkspaceBlockView) {
  const normalizedView = normalizeWorkspaceBlockView(view);
  return [...BLOCKS_QUERY_KEY, normalizedView.visibility, normalizedView.tagIds] as const;
}

export function workspaceBlockListPageQueryKey(view: WorkspaceBlockView, offset: number) {
  return [...workspaceBlockListQueryKey(view), "page", offset] as const;
}

export function getWorkspaceBlockPageOffset(index: number) {
  return Math.floor(index / BLOCKS_PAGE_SIZE) * BLOCKS_PAGE_SIZE;
}

function toListBlocksRequest(view: WorkspaceBlockView, offset: number): ListBlocksRequest {
  const normalizedView = normalizeWorkspaceBlockView(view);
  return {
    tagIds: normalizedView.tagIds.length > 0 ? normalizedView.tagIds : undefined,
    visibility: normalizedView.visibility,
    offset,
    limit: BLOCKS_PAGE_SIZE,
  };
}

export function refreshWorkspaceBlocks(): void {
  refreshBlocks();
}

export function patchWorkspaceBlock(updatedBlock: Block): void {
  queryClient.setQueriesData<ListBlocksResult>({ queryKey: BLOCKS_QUERY_KEY }, (current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      blocks: current.blocks.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)),
    };
  });
}

export function getCachedWorkspaceBlock(blockId: string): Block | undefined {
  for (const [, cached] of queryClient.getQueriesData<ListBlocksResult>({
    queryKey: BLOCKS_QUERY_KEY,
  })) {
    const found = cached?.blocks.find((block) => block.id === blockId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function useWorkspaceBlockCollection(view: WorkspaceBlockView): WorkspaceBlockCollection {
  const normalizedView = useMemo(() => normalizeWorkspaceBlockView(view), [view]);
  const viewCacheKey = `${normalizedView.visibility}:${normalizedView.tagIds.join("\u0000")}`;
  const [requestedPageOffsets, setRequestedPageOffsets] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setRequestedPageOffsets(new Set([0]));
  }, [viewCacheKey]);

  const requestedOffsets = useMemo(
    () => [...requestedPageOffsets].sort((left, right) => left - right),
    [requestedPageOffsets],
  );

  const ensureBlockIndex = useCallback((index: number) => {
    if (index < 0) {
      return;
    }

    const offset = getWorkspaceBlockPageOffset(index);
    setRequestedPageOffsets((currentOffsets) => {
      if (currentOffsets.has(offset)) {
        return currentOffsets;
      }

      const nextOffsets = new Set(currentOffsets);
      nextOffsets.add(offset);
      return nextOffsets;
    });
  }, []);

  const ensureBlockRange = useCallback((startIndex: number, endIndex: number) => {
    if (endIndex < 0 || startIndex > endIndex) {
      return;
    }

    const startOffset = getWorkspaceBlockPageOffset(Math.max(0, startIndex));
    const endOffset = getWorkspaceBlockPageOffset(endIndex);

    setRequestedPageOffsets((currentOffsets) => {
      let changed = false;
      const nextOffsets = new Set(currentOffsets);

      for (let offset = startOffset; offset <= endOffset; offset += BLOCKS_PAGE_SIZE) {
        if (!nextOffsets.has(offset)) {
          nextOffsets.add(offset);
          changed = true;
        }
      }

      return changed ? nextOffsets : currentOffsets;
    });
  }, []);

  const pageQueries = useQueries({
    queries: requestedOffsets.map((offset) => ({
      queryKey: workspaceBlockListPageQueryKey(normalizedView, offset),
      queryFn: async () => await listBlocks(toListBlocksRequest(normalizedView, offset)),
      placeholderData: (previousData: ListBlocksResult | undefined) => previousData,
    })),
  });

  const pagesByOffset = useMemo(() => {
    const pages = new Map<number, ListBlocksResult>();
    pageQueries.forEach((query, queryIndex) => {
      const page = query.data;
      if (page) {
        pages.set(requestedOffsets[queryIndex], page);
      }
    });
    return pages;
  }, [pageQueries, requestedOffsets]);

  const totalBlockCount = useMemo(() => {
    let latest: ListBlocksResult | undefined;
    for (const query of pageQueries) {
      if (query.data) {
        latest = query.data;
      }
    }
    return latest?.totalCount ?? 0;
  }, [pageQueries]);

  const getBlockAtIndex = useCallback(
    (index: number) => {
      if (index < 0) {
        return undefined;
      }

      const offset = getWorkspaceBlockPageOffset(index);
      const page = pagesByOffset.get(offset);
      return page?.blocks[index - offset];
    },
    [pagesByOffset],
  );

  const ensureBlockIndexLoaded = useCallback(
    async (index: number, options?: { refresh?: boolean }) => {
      if (index < 0) {
        return undefined;
      }

      ensureBlockIndex(index);
      const offset = getWorkspaceBlockPageOffset(index);
      const queryKey = workspaceBlockListPageQueryKey(normalizedView, offset);
      const request = toListBlocksRequest(normalizedView, offset);
      let page: ListBlocksResult;
      if (options?.refresh) {
        await queryClient.cancelQueries({ exact: true, queryKey });
        page = await listBlocks(request);
        queryClient.setQueryData(queryKey, page);
      } else {
        page = await queryClient.fetchQuery({
          queryKey,
          queryFn: async () => await listBlocks(request),
          staleTime: 0,
        });
      }
      return page.blocks[index - offset];
    },
    [ensureBlockIndex, normalizedView],
  );

  const locateBlockInView = useCallback(
    async (blockId: string) =>
      await locateBlock({
        blockId,
        tagIds: normalizedView.tagIds.length > 0 ? normalizedView.tagIds : undefined,
        visibility: normalizedView.visibility,
      }),
    [normalizedView],
  );

  return {
    totalBlockCount,
    isInitialLoading: pagesByOffset.get(0) === undefined,
    isRefreshing: pageQueries.some((query) => query.isFetching),
    getBlockAtIndex,
    ensureBlockIndex,
    ensureBlockRange,
    ensureBlockIndexLoaded,
    locateBlockInView,
    refresh: refreshWorkspaceBlocks,
    patchBlock: patchWorkspaceBlock,
    getCachedBlock: getCachedWorkspaceBlock,
  };
}
