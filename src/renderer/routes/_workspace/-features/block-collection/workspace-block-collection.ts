import {
  locateBlock,
  type Block,
  type ListBlocksResult,
  type LocateBlockResult,
} from "@renderer/clients";
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BLOCKS_PAGE_SIZE,
  fetchWorkspaceBlockPage,
  getWorkspaceBlockPageOffset,
  listWorkspaceBlockPage,
  normalizeWorkspaceBlockView,
  workspaceBlockListPageQueryKey,
  type WorkspaceBlockView,
} from "./workspace-block-cache";

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
      queryFn: async () => await listWorkspaceBlockPage(normalizedView, offset),
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
      const page = await fetchWorkspaceBlockPage(normalizedView, offset, options);
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
  };
}
