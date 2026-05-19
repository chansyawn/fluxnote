import type { Block } from "@renderer/clients";
import type { ShortcutAction } from "@shared/features/preferences/settings";
import { useCallback, useMemo } from "react";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";
import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";

export type WorkspaceBlockShortcutAction =
  | "copy-block"
  | "keep-block"
  | "archive-block"
  | "delete-block"
  | "submit-external-edit"
  | "cancel-external-edit";

export const WORKSPACE_BLOCK_SHORTCUT_ACTIONS = [
  "copy-block",
  "keep-block",
  "archive-block",
  "delete-block",
  "submit-external-edit",
  "cancel-external-edit",
] as const satisfies readonly ShortcutAction[];

export interface WorkspaceBlockActions {
  assignTags: (tagIds: string[]) => Promise<void>;
  cancelExternalEdit: () => Promise<void>;
  copy: () => Promise<void>;
  createTag: (name: string) => Promise<void>;
  deleteOrCancelExternalEdit: () => Promise<void>;
  submitExternalEdit: () => Promise<void>;
  toggleArchive: () => Promise<void>;
  toggleKeep: () => Promise<void>;
}

interface UseWorkspaceBlockActionsParams {
  block: Block;
  commands: WorkspaceCommands;
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  state: WorkspaceBlockState;
}

function isArchived(block: Block): boolean {
  return block.archivedAt !== null;
}

export function useWorkspaceBlockActions({
  block,
  commands,
  getEditor,
  state,
}: UseWorkspaceBlockActionsParams): WorkspaceBlockActions {
  const canRunBlockAction = !state.isLocked;
  const canRunExternalEditAction =
    Boolean(state.externalEditSession) && !state.isExternalEditPending;

  const copy = useCallback(async () => {
    if (!canRunBlockAction) {
      return;
    }

    await getEditor(block.id)?.copy();
  }, [block.id, canRunBlockAction, getEditor]);

  const createTag = useCallback(
    async (name: string) => {
      if (!canRunBlockAction || state.isTagCreatePending) {
        return;
      }

      const tag = await commands.createTag(name);
      const currentTagIds = block.tags.map((t) => t.id);
      await commands.assignBlockTags(block.id, [...new Set([...currentTagIds, tag.id])]);
    },
    [block.id, block.tags, canRunBlockAction, commands, state.isTagCreatePending],
  );

  const assignTags = useCallback(
    async (tagIds: string[]) => {
      if (!canRunBlockAction) {
        return;
      }

      await commands.assignBlockTags(block.id, tagIds);
    },
    [block.id, canRunBlockAction, commands],
  );

  const toggleKeep = useCallback(async () => {
    if (!canRunBlockAction || isArchived(block)) {
      return;
    }

    await commands.setBlockKeepState(block.id, !block.isKept);
  }, [block, canRunBlockAction, commands]);

  const toggleArchive = useCallback(async () => {
    if (!canRunBlockAction) {
      return;
    }

    if (isArchived(block)) {
      await commands.restoreBlock(block.id);
      return;
    }

    await commands.archiveBlock(block.id);
  }, [block, canRunBlockAction, commands]);

  const deleteOrCancelExternalEdit = useCallback(async () => {
    if (state.externalEditSession) {
      if (!canRunExternalEditAction) {
        return;
      }

      await commands.cancelExternalEdit(state.externalEditSession.editId);
      return;
    }

    if (!canRunBlockAction) {
      return;
    }

    await commands.deleteBlock(block.id);
  }, [block.id, canRunBlockAction, canRunExternalEditAction, commands, state.externalEditSession]);

  const submitExternalEdit = useCallback(async () => {
    if (!state.externalEditSession || !canRunExternalEditAction) {
      return;
    }

    await commands.submitExternalEdit(block.id, state.externalEditSession.editId);
  }, [block.id, canRunExternalEditAction, commands, state.externalEditSession]);

  const cancelExternalEdit = useCallback(async () => {
    if (!state.externalEditSession || !canRunExternalEditAction) {
      return;
    }

    await commands.cancelExternalEdit(state.externalEditSession.editId);
  }, [canRunExternalEditAction, commands, state.externalEditSession]);

  return useMemo(
    () => ({
      assignTags,
      cancelExternalEdit,
      copy,
      createTag,
      deleteOrCancelExternalEdit,
      submitExternalEdit,
      toggleArchive,
      toggleKeep,
    }),
    [
      assignTags,
      cancelExternalEdit,
      copy,
      createTag,
      deleteOrCancelExternalEdit,
      submitExternalEdit,
      toggleArchive,
      toggleKeep,
    ],
  );
}
