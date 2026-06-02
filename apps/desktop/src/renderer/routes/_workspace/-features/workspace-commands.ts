import type { Block, Tag } from "@renderer/clients";
import type { BlockCreatedSource } from "@shared/features/telemetry/contract";
import { useMemo } from "react";

import type { BlockReorderOperation } from "./use-block-mutations";
import type { WorkspaceCommands } from "./workspace-state-context";

interface UseWorkspaceCommandsParams {
  archiveBlockWithFocus: (blockId: string) => Promise<void>;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  cancelExternalEdit: (editId: string) => Promise<void>;
  createBlockWithFocus: (source: BlockCreatedSource) => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  focusBlock: (blockId: string | null) => void;
  reorderBlock: (blockId: string, operation: BlockReorderOperation) => Promise<Block>;
  restoreBlockWithFocus: (blockId: string) => Promise<void>;
  setBlockKeepState: (blockId: string, isKept: boolean) => Promise<Block>;
  setBlockPinnedState: (blockId: string, isPinned: boolean) => Promise<Block>;
  submitExternalEdit: (blockId: string, editId: string) => Promise<void>;
}

export function useWorkspaceCommandsValue({
  archiveBlockWithFocus,
  assignBlockTags,
  cancelExternalEdit,
  createBlockWithFocus,
  createTag,
  deleteBlockWithFocus,
  deleteTag,
  focusBlock,
  reorderBlock,
  restoreBlockWithFocus,
  setBlockKeepState,
  setBlockPinnedState,
  submitExternalEdit,
}: UseWorkspaceCommandsParams): WorkspaceCommands {
  return useMemo<WorkspaceCommands>(
    () => ({
      archiveBlock: archiveBlockWithFocus,
      assignBlockTags,
      cancelExternalEdit,
      createBlockWithFocus,
      createTag,
      deleteBlock: deleteBlockWithFocus,
      deleteTag,
      focusBlock,
      reorderBlock,
      restoreBlock: restoreBlockWithFocus,
      setBlockKeepState,
      setBlockPinnedState,
      submitExternalEdit,
    }),
    [
      archiveBlockWithFocus,
      assignBlockTags,
      cancelExternalEdit,
      createBlockWithFocus,
      createTag,
      deleteBlockWithFocus,
      deleteTag,
      focusBlock,
      reorderBlock,
      restoreBlockWithFocus,
      setBlockKeepState,
      setBlockPinnedState,
      submitExternalEdit,
    ],
  );
}
