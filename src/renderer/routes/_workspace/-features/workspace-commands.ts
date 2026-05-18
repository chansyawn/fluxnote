import type { Block, Tag } from "@renderer/clients";
import { useMemo } from "react";

import type { WorkspaceCommands } from "./workspace-state-context";

interface UseWorkspaceCommandsParams {
  archiveBlockWithFocus: (blockId: string) => Promise<void>;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  cancelExternalEdit: (editId: string) => Promise<void>;
  createBlockWithFocus: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  focusBlock: (blockId: string | null) => void;
  restoreBlockWithFocus: (blockId: string) => Promise<void>;
  setBlockKeepState: (blockId: string, isKept: boolean) => Promise<Block>;
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
  restoreBlockWithFocus,
  setBlockKeepState,
  submitExternalEdit,
}: UseWorkspaceCommandsParams): WorkspaceCommands {
  return useMemo<WorkspaceCommands>(
    () => ({
      archiveBlock: (blockId) => {
        void archiveBlockWithFocus(blockId);
      },
      assignBlockTags,
      cancelExternalEdit: (editId) => {
        void cancelExternalEdit(editId);
      },
      createBlockWithFocus,
      createTag,
      deleteBlock: (blockId) => {
        void deleteBlockWithFocus(blockId);
      },
      deleteTag,
      focusBlock,
      restoreBlock: (blockId) => {
        void restoreBlockWithFocus(blockId);
      },
      setBlockKeepState: (blockId, isKept) => {
        void setBlockKeepState(blockId, isKept);
      },
      submitExternalEdit: (blockId, editId) => {
        void submitExternalEdit(blockId, editId);
      },
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
      restoreBlockWithFocus,
      setBlockKeepState,
      submitExternalEdit,
    ],
  );
}
