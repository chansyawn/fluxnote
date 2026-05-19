import { useTagData } from "@renderer/features/tag/use-tag-data";
import { useMemo } from "react";

import { useWorkspaceBlockCollection } from "./block-collection/workspace-block-collection";
import { useWorkspaceBlockView } from "./block-collection/workspace-block-view";
import { useBlockEditorRegistry } from "./editor-registry/use-block-editor-registry";
import { useExternalEditSessions } from "./external-edit/use-external-edit-sessions";
import { useOpenBlockNavigation } from "./navigation/open-block-navigation";
import { useActiveBlockFocus } from "./navigation/use-active-block-focus";
import { useBlockNavigation } from "./navigation/use-block-navigation";
import { useWorkspaceBlockShortcuts } from "./shortcuts/use-workspace-block-shortcuts";
import { useBlockMutations } from "./use-block-mutations";
import { useWorkspaceCommandRuntime } from "./workspace-command-runtime";
import { useWorkspaceContextValue } from "./workspace-context-value";

export function useWorkspaceRuntime() {
  const blockView = useWorkspaceBlockView();
  const blockList = useWorkspaceBlockCollection(blockView.collectionView);
  const blockMutations = useBlockMutations();
  const tagData = useTagData();
  const editorRegistry = useBlockEditorRegistry();
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

  const { commands, externalEditActions, focusActions } = useWorkspaceCommandRuntime({
    activeBlockFocus,
    blockList,
    blockMutations,
    blockNavigation,
    blockView,
    editorRegistry,
    tagData,
  });

  useWorkspaceBlockShortcuts({
    activeBlockFocus,
    createBlockWithFocus: focusActions.createBlockWithFocus,
    deleteBlockWithFocus: focusActions.deleteBlockWithFocus,
    toggleArchiveBlockWithFocus: focusActions.toggleArchiveBlockWithFocus,
    toggleKeepBlockWithFocus: focusActions.toggleKeepBlockWithFocus,
  });

  useOpenBlockNavigation({ navigateToBlock: blockNavigation.navigateToBlock });

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
