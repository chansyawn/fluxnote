import type { useTagData } from "@renderer/features/tag/use-tag-data";
import { useCallback } from "react";

import type { WorkspaceBlockCollection } from "./block-collection/workspace-block-collection";
import type { WorkspaceBlockViewState } from "./block-collection/workspace-block-view";
import type { BlockEditorRegistry } from "./editor-registry/use-block-editor-registry";
import { useExternalEditActions } from "./external-edit/use-external-edit-actions";
import type { ActiveBlockFocus } from "./navigation/use-active-block-focus";
import { useBlockFocusActions } from "./navigation/use-block-focus-actions";
import type { useBlockNavigation } from "./navigation/use-block-navigation";
import type { BlockReorderOperation } from "./use-block-mutations";
import type { UseBlockMutationsResult } from "./use-block-mutations";
import { useWorkspaceCommandsValue } from "./workspace-commands";

interface UseWorkspaceCommandRuntimeParams {
  activeBlockFocus: ActiveBlockFocus;
  blockList: Pick<
    WorkspaceBlockCollection,
    "ensureBlockIndexLoaded" | "locateBlockInView" | "totalBlockCount"
  >;
  blockMutations: UseBlockMutationsResult;
  blockNavigation: Pick<ReturnType<typeof useBlockNavigation>, "activeBlockId" | "navigateToBlock">;
  blockView: Pick<WorkspaceBlockViewState, "selectedTagIds">;
  editorRegistry: Pick<BlockEditorRegistry, "getEditor">;
  tagData: Pick<ReturnType<typeof useTagData>, "createTag" | "deleteTag" | "updateTag">;
}

export function useWorkspaceCommandRuntime({
  activeBlockFocus,
  blockList,
  blockMutations,
  blockNavigation,
  blockView,
  editorRegistry,
  tagData,
}: UseWorkspaceCommandRuntimeParams) {
  const createBlockInCurrentTagFilter = useCallback(async () => {
    const block = await blockMutations.createBlock();
    if (blockView.selectedTagIds.length > 0) {
      return await blockMutations.assignBlockTags(block.id, blockView.selectedTagIds);
    }
    return block;
  }, [blockMutations.assignBlockTags, blockMutations.createBlock, blockView.selectedTagIds]);

  const reorderBlockInCurrentView = useCallback(
    (blockId: string, operation: BlockReorderOperation) =>
      blockMutations.reorderBlock(blockId, operation, blockView.selectedTagIds),
    [blockMutations.reorderBlock, blockView.selectedTagIds],
  );

  const focusActions = useBlockFocusActions({
    activeBlockId: blockNavigation.activeBlockId,
    archiveBlock: blockMutations.archiveBlock,
    restoreBlock: blockMutations.restoreBlock,
    totalBlockCount: blockList.totalBlockCount,
    createBlock: createBlockInCurrentTagFilter,
    deleteBlock: blockMutations.deleteBlock,
    reorderBlock: reorderBlockInCurrentView,
    setBlockPinnedState: blockMutations.setPinnedState,
    ensureBlockIndexLoaded: blockList.ensureBlockIndexLoaded,
    navigateToBlock: blockNavigation.navigateToBlock,
    locateBlockInView: blockList.locateBlockInView,
    setActiveBlockId: activeBlockFocus.focusBlock,
  });

  const externalEditActions = useExternalEditActions({
    getEditor: editorRegistry.getEditor,
    navigateToBlock: blockNavigation.navigateToBlock,
  });

  const commands = useWorkspaceCommandsValue({
    archiveBlockWithFocus: focusActions.archiveBlockWithFocus,
    assignBlockTags: blockMutations.assignBlockTags,
    cancelExternalEdit: externalEditActions.handleCancelExternalEdit,
    createBlockWithFocus: focusActions.createBlockWithFocus,
    createTag: tagData.createTag,
    deleteBlockWithFocus: focusActions.deleteBlockWithFocus,
    deleteTag: tagData.deleteTag,
    focusBlock: activeBlockFocus.focusBlock,
    reorderBlock: focusActions.reorderBlockWithFocus,
    restoreBlockWithFocus: focusActions.restoreBlockWithFocus,
    setBlockKeepState: blockMutations.setKeepState,
    setBlockPinnedState: focusActions.setBlockPinnedStateWithFocus,
    submitExternalEdit: externalEditActions.handleSubmitExternalEdit,
    updateTag: tagData.updateTag,
  });

  return {
    commands,
    externalEditActions,
    focusActions,
  };
}
