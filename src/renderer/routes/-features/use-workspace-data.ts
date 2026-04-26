import { queryClient } from "@renderer/app/query";
import {
  archiveBlock,
  createBlock,
  createTag,
  deleteBlock,
  deleteTag,
  listBlocks,
  locateBlock,
  listTags,
  restoreBlock,
  setBlockTags,
  type Block,
  type BlockVisibility,
  type ListBlocksResult,
  type LocateBlockResult,
  type Tag,
} from "@renderer/clients";
import {
  BLOCKS_PAGE_SIZE,
  blockListPageQueryKey,
  getBlockPageOffset,
  tagListQueryKey,
} from "@renderer/features/note-block/note-query-key";
import { useMutation, useMutationState, useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type BlockMutationOperation = "archive" | "restore" | "delete" | "setTags";
export type TagMutationOperation = "create" | "delete";

interface UseWorkspaceDataParams {
  visibility: BlockVisibility;
  selectedTagIds: string[];
}

interface UseWorkspaceDataResult {
  loadedBlocks: Block[];
  totalBlockCount: number;
  tags: Tag[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndex: (index: number) => void;
  ensureBlockIndexLoaded: (index: number) => Promise<void>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  isCreatingBlock: boolean;
  createBlock: () => Promise<Block>;
  archiveBlock: (blockId: string) => Promise<Block>;
  restoreBlock: (blockId: string) => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (tagId: string) => Promise<void>;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  isBlockLocked: (blockId: string) => boolean;
  isBlockOpPending: (blockId: string, op: BlockMutationOperation) => boolean;
  isTagOpPending: (op: TagMutationOperation, tagId?: string) => boolean;
}

function handleMutationError(message: string, error: unknown): void {
  console.error(message, error);
  toast.error(message);
}

function usePendingBlockIdsByOperation() {
  const pendingArchiveBlockIds = useMutationState<string>({
    filters: { mutationKey: ["blocks", "archive"], status: "pending" },
    select: (mutation) => mutation.state.variables as string,
  });
  const pendingRestoreBlockIds = useMutationState<string>({
    filters: { mutationKey: ["blocks", "restore"], status: "pending" },
    select: (mutation) => mutation.state.variables as string,
  });
  const pendingDeleteBlockIds = useMutationState<string>({
    filters: { mutationKey: ["blocks", "delete"], status: "pending" },
    select: (mutation) => mutation.state.variables as string,
  });
  const pendingSetTagsBlockIds = useMutationState<string>({
    filters: { mutationKey: ["blocks", "setTags"], status: "pending" },
    select: (mutation) => (mutation.state.variables as { blockId: string }).blockId,
  });

  return useMemo(
    () => ({
      archive: new Set(pendingArchiveBlockIds),
      restore: new Set(pendingRestoreBlockIds),
      delete: new Set(pendingDeleteBlockIds),
      setTags: new Set(pendingSetTagsBlockIds),
    }),
    [pendingArchiveBlockIds, pendingDeleteBlockIds, pendingRestoreBlockIds, pendingSetTagsBlockIds],
  );
}

function usePendingTagOperationState() {
  const pendingTagCreateCount = useMutationState({
    filters: { mutationKey: ["tags", "create"], status: "pending" },
    select: () => true,
  }).length;
  const pendingDeleteTagIds = useMutationState<string>({
    filters: { mutationKey: ["tags", "delete"], status: "pending" },
    select: (mutation) => mutation.state.variables as string,
  });

  return useMemo(
    () => ({
      createCount: pendingTagCreateCount,
      deleteTagIds: new Set(pendingDeleteTagIds),
    }),
    [pendingDeleteTagIds, pendingTagCreateCount],
  );
}

export function useWorkspaceData({
  visibility,
  selectedTagIds,
}: UseWorkspaceDataParams): UseWorkspaceDataResult {
  const normalizedTagIds = useMemo(
    () => [...selectedTagIds].sort((left, right) => left.localeCompare(right)),
    [selectedTagIds],
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
  const tagsQuery = useQuery({
    queryKey: tagListQueryKey,
    queryFn: listTags,
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

  const loadedBlocks = useMemo(
    () =>
      [...pagesByOffset.values()]
        .sort((left, right) => left.offset - right.offset)
        .flatMap((page) => page.blocks),
    [pagesByOffset],
  );
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
    async (index: number) => {
      if (index < 0) {
        return;
      }

      ensureBlockIndex(index);
      const offset = getBlockPageOffset(index);
      await queryClient.fetchQuery({
        queryKey: blockListPageQueryKey(normalizedTagIds, visibility, offset),
        queryFn: async () =>
          await listBlocks({
            tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
            visibility,
            offset,
            limit: BLOCKS_PAGE_SIZE,
          }),
        staleTime: 0,
      });
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

  const createBlockMutation = useMutation({
    mutationKey: ["blocks", "create"],
    mutationFn: async () => {
      const newBlock = await createBlock();

      if (selectedTagIds.length === 0) {
        return newBlock;
      }

      return await setBlockTags({ blockId: newBlock.id, tagIds: selectedTagIds });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      handleMutationError("Failed to create block.", error);
    },
  });

  const archiveBlockMutation = useMutation({
    mutationKey: ["blocks", "archive"],
    mutationFn: async (blockId: string) => await archiveBlock({ blockId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      handleMutationError("Failed to archive block.", error);
    },
  });

  const restoreBlockMutation = useMutation({
    mutationKey: ["blocks", "restore"],
    mutationFn: async (blockId: string) => await restoreBlock({ blockId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      handleMutationError("Failed to restore block.", error);
    },
  });

  const deleteBlockMutation = useMutation({
    mutationKey: ["blocks", "delete"],
    mutationFn: async (blockId: string) => await deleteBlock({ blockId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      handleMutationError("Failed to delete block.", error);
    },
  });

  const createTagMutation = useMutation({
    mutationKey: ["tags", "create"],
    mutationFn: async (name: string) => await createTag({ name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (error) => {
      handleMutationError("Failed to create tag.", error);
    },
  });

  const deleteTagMutation = useMutation({
    mutationKey: ["tags", "delete"],
    mutationFn: async (tagId: string) => await deleteTag({ tagId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      handleMutationError("Failed to delete tag.", error);
    },
  });

  const setBlockTagsMutation = useMutation({
    mutationKey: ["blocks", "setTags"],
    mutationFn: async ({ blockId, tagIds }: { blockId: string; tagIds: string[] }) =>
      await setBlockTags({ blockId, tagIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      handleMutationError("Failed to update block tags.", error);
    },
  });

  const pendingBlockIdsByOperation = usePendingBlockIdsByOperation();
  const pendingTagOperationState = usePendingTagOperationState();

  const stableCreateBlock = useCallback(
    () => createBlockMutation.mutateAsync(),
    [createBlockMutation.mutateAsync],
  );
  const stableArchiveBlock = useCallback(
    (blockId: string) => archiveBlockMutation.mutateAsync(blockId),
    [archiveBlockMutation.mutateAsync],
  );
  const stableRestoreBlock = useCallback(
    (blockId: string) => restoreBlockMutation.mutateAsync(blockId),
    [restoreBlockMutation.mutateAsync],
  );
  const stableDeleteBlock = useCallback(
    async (blockId: string) => {
      await deleteBlockMutation.mutateAsync(blockId);
    },
    [deleteBlockMutation.mutateAsync],
  );
  const stableCreateTag = useCallback(
    (name: string) => createTagMutation.mutateAsync(name),
    [createTagMutation.mutateAsync],
  );
  const stableDeleteTag = useCallback(
    async (tagId: string) => {
      await deleteTagMutation.mutateAsync(tagId);
    },
    [deleteTagMutation.mutateAsync],
  );
  const stableAssignBlockTags = useCallback(
    (blockId: string, tagIds: string[]) => setBlockTagsMutation.mutateAsync({ blockId, tagIds }),
    [setBlockTagsMutation.mutateAsync],
  );

  return {
    loadedBlocks,
    totalBlockCount,
    tags: tagsQuery.data ?? [],
    isInitialLoading: pagesByOffset.get(0) === undefined || tagsQuery.data === undefined,
    isRefreshing: pageQueries.some((query) => query.isFetching) || tagsQuery.isFetching,
    getBlockAtIndex,
    ensureBlockIndex,
    ensureBlockIndexLoaded,
    locateBlockInView,
    isCreatingBlock: createBlockMutation.isPending,
    createBlock: stableCreateBlock,
    archiveBlock: stableArchiveBlock,
    restoreBlock: stableRestoreBlock,
    deleteBlock: stableDeleteBlock,
    createTag: stableCreateTag,
    deleteTag: stableDeleteTag,
    assignBlockTags: stableAssignBlockTags,
    isBlockLocked: (blockId: string) =>
      (["archive", "restore", "delete", "setTags"] as BlockMutationOperation[]).some((op) =>
        pendingBlockIdsByOperation[op].has(blockId),
      ),
    isBlockOpPending: (blockId: string, op: BlockMutationOperation) =>
      pendingBlockIdsByOperation[op].has(blockId),
    isTagOpPending: (op: TagMutationOperation, tagId?: string) => {
      if (op === "create") {
        return pendingTagOperationState.createCount > 0;
      }

      if (!tagId) {
        return pendingTagOperationState.deleteTagIds.size > 0;
      }

      return pendingTagOperationState.deleteTagIds.has(tagId);
    },
  };
}
