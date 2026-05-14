import { queryClient } from "@renderer/app/query";
import {
  listBlocks,
  locateBlock,
  type Block,
  type BlockVisibility,
  type ListBlocksResult,
  type LocateBlockResult,
} from "@renderer/clients";
import {
  BLOCKS_PAGE_SIZE,
  blockListPageQueryKey,
  getBlockPageOffset,
} from "@renderer/features/block/query-key";
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseBlockListParams {
  visibility: BlockVisibility;
  tagIds: string[];
}

interface UseBlockListResult {
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
}

export function useBlockList({ visibility, tagIds }: UseBlockListParams): UseBlockListResult {
  const normalizedTagIds = useMemo(
    () => [...tagIds].sort((left, right) => left.localeCompare(right)),
    [tagIds],
  );
  const viewCacheKey = `${visibility}:${normalizedTagIds.join("\u0000")}`;
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

    const offset = getBlockPageOffset(index);
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

    const startOffset = getBlockPageOffset(Math.max(0, startIndex));
    const endOffset = getBlockPageOffset(endIndex);

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
      queryKey: blockListPageQueryKey(normalizedTagIds, visibility, offset),
      queryFn: async () =>
        await listBlocks({
          tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
          visibility,
          offset,
          limit: BLOCKS_PAGE_SIZE,
        }),
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

      const offset = getBlockPageOffset(index);
      const page = pagesByOffset.get(offset);
      return page?.blocks[index - offset];
    },
    [pagesByOffset],
  );

  const ensureBlockIndexLoaded = useCallback(
    async (index: number, options?: { refresh?: boolean }) => {
      if (index < 0) {
        return;
      }

      ensureBlockIndex(index);
      const offset = getBlockPageOffset(index);
      const queryKey = blockListPageQueryKey(normalizedTagIds, visibility, offset);
      const request = {
        tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
        visibility,
        offset,
        limit: BLOCKS_PAGE_SIZE,
      };
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
    [ensureBlockIndex, normalizedTagIds, visibility],
  );

  const locateBlockInView = useCallback(
    async (blockId: string) =>
      await locateBlock({
        blockId,
        tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
        visibility,
      }),
    [normalizedTagIds, visibility],
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
  };
}
