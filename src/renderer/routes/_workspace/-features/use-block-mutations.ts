import {
  archiveBlock,
  createBlock,
  deleteBlock,
  restoreBlock,
  setBlockTags,
  setBlockKeepState,
  type Block,
} from "@renderer/clients";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { refreshWorkspaceBlocks } from "./block-collection/workspace-block-collection";

export type BlockMutationOperation = "archive" | "restore" | "delete" | "setKeep" | "setTags";

export interface UseBlockMutationsResult {
  createBlock: () => Promise<Block>;
  archiveBlock: (blockId: string) => Promise<Block>;
  restoreBlock: (blockId: string) => Promise<Block>;
  setKeepState: (blockId: string, isKept: boolean) => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  isCreatingBlock: boolean;
  isBlockLocked: (blockId: string) => boolean;
  isBlockOpPending: (blockId: string, op: BlockMutationOperation) => boolean;
  pendingBlockIdsByOperation: ReturnType<typeof usePendingBlockIdsByOperation>;
}

function handleMutationError(message: string, error: unknown): void {
  console.error(message, error);
  toast.error(message);
}

export function usePendingBlockIdsByOperation() {
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
  const pendingSetKeepBlockIds = useMutationState<string>({
    filters: { mutationKey: ["blocks", "setKeep"], status: "pending" },
    select: (mutation) => (mutation.state.variables as { blockId: string }).blockId,
  });

  return useMemo(
    () => ({
      archive: new Set(pendingArchiveBlockIds),
      restore: new Set(pendingRestoreBlockIds),
      delete: new Set(pendingDeleteBlockIds),
      setKeep: new Set(pendingSetKeepBlockIds),
      setTags: new Set(pendingSetTagsBlockIds),
    }),
    [
      pendingArchiveBlockIds,
      pendingDeleteBlockIds,
      pendingRestoreBlockIds,
      pendingSetKeepBlockIds,
      pendingSetTagsBlockIds,
    ],
  );
}

export function useBlockMutations(): UseBlockMutationsResult {
  const createBlockMutation = useMutation({
    mutationKey: ["blocks", "create"],
    mutationFn: async () => await createBlock(),
    onSuccess: () => {
      refreshWorkspaceBlocks();
    },
    onError: (error) => {
      handleMutationError("Failed to create block.", error);
    },
  });

  const archiveBlockMutation = useMutation({
    mutationKey: ["blocks", "archive"],
    mutationFn: async (blockId: string) => await archiveBlock({ blockId }),
    onSuccess: () => {
      refreshWorkspaceBlocks();
    },
    onError: (error) => {
      handleMutationError("Failed to archive block.", error);
    },
  });

  const restoreBlockMutation = useMutation({
    mutationKey: ["blocks", "restore"],
    mutationFn: async (blockId: string) => await restoreBlock({ blockId }),
    onSuccess: () => {
      refreshWorkspaceBlocks();
    },
    onError: (error) => {
      handleMutationError("Failed to restore block.", error);
    },
  });

  const deleteBlockMutation = useMutation({
    mutationKey: ["blocks", "delete"],
    mutationFn: async (blockId: string) => await deleteBlock({ blockId }),
    onSuccess: () => {
      refreshWorkspaceBlocks();
    },
    onError: (error) => {
      handleMutationError("Failed to delete block.", error);
    },
  });

  const setBlockTagsMutation = useMutation({
    mutationKey: ["blocks", "setTags"],
    mutationFn: async ({ blockId, tagIds }: { blockId: string; tagIds: string[] }) =>
      await setBlockTags({ blockId, tagIds }),
    onSuccess: () => {
      refreshWorkspaceBlocks();
    },
    onError: (error) => {
      handleMutationError("Failed to update block tags.", error);
    },
  });

  const setBlockKeepMutation = useMutation({
    mutationKey: ["blocks", "setKeep"],
    mutationFn: async ({ blockId, isKept }: { blockId: string; isKept: boolean }) =>
      await setBlockKeepState({ blockId, isKept }),
    onSuccess: () => {
      refreshWorkspaceBlocks();
    },
    onError: (error) => {
      handleMutationError("Failed to update block keep state.", error);
    },
  });

  const pendingBlockIdsByOperation = usePendingBlockIdsByOperation();

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
  const stableAssignBlockTags = useCallback(
    (blockId: string, tagIds: string[]) => setBlockTagsMutation.mutateAsync({ blockId, tagIds }),
    [setBlockTagsMutation.mutateAsync],
  );
  const stableSetKeepState = useCallback(
    (blockId: string, isKept: boolean) => setBlockKeepMutation.mutateAsync({ blockId, isKept }),
    [setBlockKeepMutation.mutateAsync],
  );

  return {
    createBlock: stableCreateBlock,
    archiveBlock: stableArchiveBlock,
    restoreBlock: stableRestoreBlock,
    setKeepState: stableSetKeepState,
    deleteBlock: stableDeleteBlock,
    assignBlockTags: stableAssignBlockTags,
    isCreatingBlock: createBlockMutation.isPending,
    isBlockLocked: (blockId: string) =>
      (["archive", "restore", "delete", "setKeep", "setTags"] as BlockMutationOperation[]).some(
        (op) => pendingBlockIdsByOperation[op].has(blockId),
      ),
    isBlockOpPending: (blockId: string, op: BlockMutationOperation) =>
      pendingBlockIdsByOperation[op].has(blockId),
    pendingBlockIdsByOperation,
  };
}
