import { useTagData } from "@renderer/features/tag/use-tag-data";
import { useCallback, useMemo } from "react";

import { useWorkspaceBlockCollection } from "./block-collection/workspace-block-collection";
import { useWorkspaceBlockView } from "./block-collection/workspace-block-view";
import { useBlockShortcuts } from "./editing/use-block-shortcuts";
import { useEditorRegistry } from "./editing/use-editor-registry";
import { useExternalEditActions } from "./editing/use-external-edit-actions";
import { useExternalEditSessions } from "./editing/use-external-edit-sessions";
import { useActiveBlockFocus } from "./navigation/use-active-block-focus";
import { useBlockFocusActions } from "./navigation/use-block-focus-actions";
import { useBlockNavigation } from "./navigation/use-block-navigation";
import { useOpenBlockNavigation } from "./open-block-navigation";
import { useBlockMutations } from "./use-block-mutations";
import { useWorkspaceCommandsValue } from "./workspace-commands";
import { useWorkspaceContextValue } from "./workspace-context-value";

export function useWorkspaceRuntime() {
  const blockView = useWorkspaceBlockView();
  const blockList = useWorkspaceBlockCollection(blockView.collectionView);
  const blockMutations = useBlockMutations();
  const tagData = useTagData();
  const editorRegistry = useEditorRegistry();
  const { sessionsByBlockId } = useExternalEditSessions();
  const blockNavigationCollection = useMemo(
    () => ({
      ensureBlockIndexLoaded: blockList.ensureBlockIndexLoaded,
      getBlockAtIndex: blockList.getBlockAtIndex,
      locateBlockInView: blockList.locateBlockInView,
    }),
    [blockList.ensureBlockIndexLoaded, blockList.getBlockAtIndex, blockList.locateBlockInView],
  );
  const blockNavigation = useBlockNavigation({
    blockCollection: blockNavigationCollection,
    registry: editorRegistry,
    workspaceView: blockView.navigationView,
  });

  const activeBlockFocus = useActiveBlockFocus({
    activeBlockId: blockNavigation.activeBlockId,
    setActiveBlockId: blockNavigation.setActiveBlockId,
  });

  const createBlockInCurrentTagFilter = useCallback(async () => {
    const block = await blockMutations.createBlock();
    if (blockView.selectedTagIds.length > 0) {
      return await blockMutations.assignBlockTags(block.id, blockView.selectedTagIds);
    }
    return block;
  }, [blockMutations.assignBlockTags, blockMutations.createBlock, blockView.selectedTagIds]);

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
    ensureBlockIndexLoaded: blockList.ensureBlockIndexLoaded,
    navigateToBlock: blockNavigation.navigateToBlock,
    locateBlockInView: blockList.locateBlockInView,
    setBlockKeepState: blockMutations.setKeepState,
    setActiveBlockId: activeBlockFocus.focusBlock,
  });

  useBlockShortcuts({
    activeBlockFocus,
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
    focusBlock: activeBlockFocus.focusBlock,
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
    visibility: blockView.visibility,
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
      addTagFilter: blockView.addTagFilter,
      removeTagFilter: blockView.removeTagFilter,
      selectedTagIds: blockView.selectedTagIds,
      setSelectedTagIds: blockView.setSelectedTagIds,
      setVisibility: blockView.setVisibility,
      visibility: blockView.visibility,
    },
  };
}
