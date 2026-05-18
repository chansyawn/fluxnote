import type { BlockVisibility } from "@renderer/clients";
import { useTagData } from "@renderer/features/tag/use-tag-data";
import { useCallback, useState } from "react";

import { useBlockShortcuts } from "./editing/use-block-shortcuts";
import { useEditorRegistry } from "./editing/use-editor-registry";
import { useExternalEditActions } from "./editing/use-external-edit-actions";
import { useExternalEditSessions } from "./editing/use-external-edit-sessions";
import { useBlockList } from "./list/use-block-list";
import { useBlockFocusActions } from "./navigation/use-block-focus-actions";
import { useBlockNavigation } from "./navigation/use-block-navigation";
import { useOpenBlockNavigation } from "./open-block-navigation";
import { useBlockMutations } from "./use-block-mutations";
import { useWorkspaceCommandsValue } from "./workspace-commands";
import { useWorkspaceContextValue } from "./workspace-context-value";

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

  const createBlockInCurrentTagFilter = useCallback(async () => {
    const block = await blockMutations.createBlock();
    if (selectedTagIds.length > 0) {
      return await blockMutations.assignBlockTags(block.id, selectedTagIds);
    }
    return block;
  }, [blockMutations.assignBlockTags, blockMutations.createBlock, selectedTagIds]);

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
    createBlock: createBlockInCurrentTagFilter,
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

  useOpenBlockNavigation({ navigateToBlock: blockNavigation.navigateToBlock });

  const commands = useWorkspaceCommandsValue({
    archiveBlockWithFocus,
    assignBlockTags: blockMutations.assignBlockTags,
    cancelExternalEdit: externalEditActions.handleCancelExternalEdit,
    createBlockWithFocus,
    createTag: tagData.createTag,
    deleteBlockWithFocus,
    deleteTag: tagData.deleteTag,
    focusBlock,
    restoreBlockWithFocus,
    setBlockKeepState: blockMutations.setKeepState,
    submitExternalEdit: externalEditActions.handleSubmitExternalEdit,
  });

  const workspaceContextValue = useWorkspaceContextValue({
    commands,
    isTagCreatePending: tagData.isTagOpPending("create"),
    pendingBlockOps: blockMutations.pendingBlockIdsByOperation,
    pendingExternalEditIds: externalEditActions.pendingExternalEditIds,
    sessionsByBlockId,
    tags: tagData.tags,
    visibility,
  });

  return {
    blockList,
    blockMutations,
    blockNavigation,
    commands,
    editorRegistry,
    workspaceContextValue,
    tagData,
    viewState: {
      selectedTagIds,
      setSelectedTagIds,
      setVisibility,
      visibility,
    },
  };
}
