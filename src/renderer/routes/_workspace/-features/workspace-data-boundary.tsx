import { queryClient } from "@renderer/app/query";
import type { BlockVisibility } from "@renderer/clients";
import { useOpenBlockRequest } from "@renderer/features/open-block/open-block-request-context";
import { useTagData } from "@renderer/features/tag/use-tag-data";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useBlockShortcuts } from "./editing/use-block-shortcuts";
import { useEditorRegistry } from "./editing/use-editor-registry";
import { useExternalEditActions } from "./external-edit/use-external-edit-actions";
import { useExternalEditSessions } from "./external-edit/use-external-edit-sessions";
import { useBlockList } from "./list/use-block-list";
import { useBlockFocusActions } from "./navigation/use-block-focus-actions";
import { useBlockNavigation } from "./navigation/use-block-navigation";
import { useBlockMutations } from "./use-block-mutations";
import { type WorkspaceCommands } from "./workspace-state-context";

export function useWorkspaceDataBoundary() {
  const [visibility, setVisibility] = useState<BlockVisibility>("active");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const blockList = useBlockList({ visibility, tagIds: selectedTagIds });
  const blockMutations = useBlockMutations();
  const tagData = useTagData();
  const editorRegistry = useEditorRegistry();
  const { sessionsByBlockId } = useExternalEditSessions();

  const blockNavigation = useBlockNavigation({
    registry: editorRegistry,
    visibility,
    selectedTagIds,
    setVisibility,
    setSelectedTagIds,
    getBlockAtIndex: blockList.getBlockAtIndex,
    ensureBlockIndexLoaded: blockList.ensureBlockIndexLoaded,
    locateBlockInView: blockList.locateBlockInView,
  });

  const focusBlock = useCallback(
    (blockId: string | null) => {
      blockNavigation.setActiveBlockId(blockId);
    },
    [blockNavigation.setActiveBlockId],
  );

  const {
    archiveBlockWithFocus,
    createBlockWithFocus,
    deleteBlockWithFocus,
    restoreBlockWithFocus,
    toggleArchiveBlockWithFocus,
    toggleKeepBlockWithFocus,
  } = useBlockFocusActions({
    activeBlockId: blockNavigation.activeBlockId,
    archiveBlock: blockMutations.archiveBlock,
    restoreBlock: blockMutations.restoreBlock,
    totalBlockCount: blockList.totalBlockCount,
    createBlock: async () => {
      const block = await blockMutations.createBlock();
      if (selectedTagIds.length > 0) {
        return await blockMutations.assignBlockTags(block.id, selectedTagIds);
      }
      return block;
    },
    deleteBlock: blockMutations.deleteBlock,
    navigateToBlock: blockNavigation.navigateToBlock,
    navigateToIndex: blockNavigation.navigateToIndex,
    locateBlockInView: blockList.locateBlockInView,
    setBlockKeepState: blockMutations.setKeepState,
    setActiveBlockId: focusBlock,
  });

  useBlockShortcuts({
    activeBlockId: blockNavigation.activeBlockId,
    createBlockWithFocus,
    deleteBlockWithFocus,
    toggleArchiveBlockWithFocus,
    toggleKeepBlockWithFocus,
  });

  const externalEditActions = useExternalEditActions({
    getEditor: editorRegistry.getEditor,
    navigateToBlock: blockNavigation.navigateToBlock,
  });

  const { acknowledgePendingBlockId, pendingTarget } = useOpenBlockRequest();
  useEffect(() => {
    if (!pendingTarget) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["blocks"] });

    blockNavigation.navigateToBlock(pendingTarget.blockId, {
      acknowledge: () => {
        acknowledgePendingBlockId(pendingTarget.blockId);
      },
      onNotFound: () => undefined,
      viewMode: "active-unfiltered",
    });
  }, [acknowledgePendingBlockId, blockNavigation.navigateToBlock, pendingTarget]);

  const commands = useMemo<WorkspaceCommands>(
    () => ({
      archiveBlock: (blockId) => {
        void archiveBlockWithFocus(blockId);
      },
      assignBlockTags: blockMutations.assignBlockTags,
      cancelExternalEdit: (editId) => {
        void externalEditActions.handleCancelExternalEdit(editId);
      },
      createBlockWithFocus,
      createTag: tagData.createTag,
      deleteBlock: (blockId) => {
        void deleteBlockWithFocus(blockId);
      },
      deleteTag: tagData.deleteTag,
      focusBlock,
      restoreBlock: (blockId) => {
        void restoreBlockWithFocus(blockId);
      },
      setBlockKeepState: (blockId, isKept) => {
        void blockMutations.setKeepState(blockId, isKept);
      },
      submitExternalEdit: (blockId, editId) => {
        void externalEditActions.handleSubmitExternalEdit(blockId, editId);
      },
    }),
    [
      blockMutations.assignBlockTags,
      blockMutations.restoreBlock,
      blockMutations.setKeepState,
      archiveBlockWithFocus,
      createBlockWithFocus,
      deleteBlockWithFocus,
      externalEditActions.handleCancelExternalEdit,
      externalEditActions.handleSubmitExternalEdit,
      focusBlock,
      restoreBlockWithFocus,
      tagData.createTag,
      tagData.deleteTag,
      toggleKeepBlockWithFocus,
    ],
  );

  const stateContextValue = useMemo(
    () => ({
      commands,
      isTagCreatePending: tagData.isTagOpPending("create"),
      pendingBlockOps: blockMutations.pendingBlockIdsByOperation,
      pendingExternalEditIds: externalEditActions.pendingExternalEditIds,
      sessionsByBlockId,
      tags: tagData.tags,
      visibility,
    }),
    [
      blockMutations.pendingBlockIdsByOperation,
      commands,
      externalEditActions.pendingExternalEditIds,
      sessionsByBlockId,
      tagData,
      visibility,
    ],
  );

  return {
    blockList,
    blockMutations,
    blockNavigation,
    commands,
    editorRegistry,
    stateContextValue,
    tagData,
    viewState: {
      selectedTagIds,
      setSelectedTagIds,
      setVisibility,
      visibility,
    },
  };
}
