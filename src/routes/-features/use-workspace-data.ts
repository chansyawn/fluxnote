import { useMutation, useMutationState, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { queryClient } from "@/app/query";
import {
  archiveBlock,
  createBlock,
  createTag,
  deleteBlock,
  deleteTag,
  listBlocks,
  listTags,
  restoreBlock,
  setBlockTags,
  type Block,
  type BlockVisibility,
  type Tag,
} from "@/clients";
import { blockListQueryKey, tagListQueryKey } from "@/features/note-block/note-query-key";

export type BlockMutationOperation = "archive" | "restore" | "delete" | "setTags";
export type TagMutationOperation = "create" | "delete";

interface UseWorkspaceDataParams {
  visibility: BlockVisibility;
  selectedTagIds: string[];
}

interface UseWorkspaceDataResult {
  blocks: Block[];
  tags: Tag[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
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
  const blocksQuery = useQuery({
    queryKey: blockListQueryKey(selectedTagIds, visibility),
    queryFn: async () =>
      await listBlocks({
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        visibility,
      }),
    placeholderData: (previousData) => previousData,
  });
  const tagsQuery = useQuery({
    queryKey: tagListQueryKey,
    queryFn: listTags,
  });

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

  return {
    blocks: blocksQuery.data ?? [],
    tags: tagsQuery.data ?? [],
    isInitialLoading: blocksQuery.data === undefined || tagsQuery.data === undefined,
    isRefreshing: blocksQuery.isFetching || tagsQuery.isFetching,
    isCreatingBlock: createBlockMutation.isPending,
    createBlock: async () => await createBlockMutation.mutateAsync(),
    archiveBlock: async (blockId: string) => await archiveBlockMutation.mutateAsync(blockId),
    restoreBlock: async (blockId: string) => await restoreBlockMutation.mutateAsync(blockId),
    deleteBlock: async (blockId: string) => {
      await deleteBlockMutation.mutateAsync(blockId);
    },
    createTag: async (name: string) => await createTagMutation.mutateAsync(name),
    deleteTag: async (tagId: string) => {
      await deleteTagMutation.mutateAsync(tagId);
    },
    assignBlockTags: async (blockId: string, tagIds: string[]) =>
      await setBlockTagsMutation.mutateAsync({ blockId, tagIds }),
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
