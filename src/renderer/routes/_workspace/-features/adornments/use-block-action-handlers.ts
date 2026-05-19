import type { Block } from "@renderer/clients";
import { useCallback, useMemo } from "react";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";
import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";

interface WorkspaceBlockActionHandlersParams {
  block: Block;
  commands: WorkspaceCommands;
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  state: WorkspaceBlockState;
}

export interface WorkspaceBlockActionHandlers {
  assignTags: (tagIds: string[]) => Promise<void>;
  copy: () => void;
  createTag: (name: string) => Promise<void>;
  deleteOrCancelExternalEdit: () => void;
  submitExternalEdit: (editId: string) => void;
  cancelExternalEdit: (editId: string) => void;
  toggleArchive: () => void;
  toggleKeep: () => void;
}

export function useWorkspaceBlockActionHandlers({
  block,
  commands,
  getEditor,
  state,
}: WorkspaceBlockActionHandlersParams): WorkspaceBlockActionHandlers {
  const copy = useCallback(() => {
    void getEditor(block.id)?.copy();
  }, [block.id, getEditor]);

  const createTag = useCallback(
    async (name: string) => {
      const tag = await commands.createTag(name);
      const currentTagIds = block.tags.map((t) => t.id);
      await commands.assignBlockTags(block.id, [...new Set([...currentTagIds, tag.id])]);
    },
    [block.id, block.tags, commands],
  );

  const assignTags = useCallback(
    async (tagIds: string[]) => {
      await commands.assignBlockTags(block.id, tagIds);
    },
    [block.id, commands],
  );

  const toggleKeep = useCallback(() => {
    commands.setBlockKeepState(block.id, !block.isKept);
  }, [block.id, block.isKept, commands]);

  const toggleArchive = useCallback(() => {
    if (state.visibility === "active") {
      commands.archiveBlock(block.id);
      return;
    }
    commands.restoreBlock(block.id);
  }, [block.id, commands, state.visibility]);

  const deleteOrCancelExternalEdit = useCallback(() => {
    if (state.externalEditSession) {
      commands.cancelExternalEdit(state.externalEditSession.editId);
      return;
    }
    commands.deleteBlock(block.id);
  }, [block.id, commands, state.externalEditSession]);

  const submitExternalEdit = useCallback(
    (editId: string) => {
      commands.submitExternalEdit(block.id, editId);
    },
    [block.id, commands],
  );

  const cancelExternalEdit = useCallback(
    (editId: string) => {
      commands.cancelExternalEdit(editId);
    },
    [commands],
  );

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
