import { useTagData } from "@renderer/features/tag/use-tag-data";
import { useCallback, useEffect, useMemo } from "react";

import { useBlockShortcuts } from "./editing/use-block-shortcuts";
import { useEditorRegistry } from "./editing/use-editor-registry";
import { useExternalEditActions } from "./external-edit/use-external-edit-actions";
import { useExternalEditSessions } from "./external-edit/use-external-edit-sessions";
import type { BlockListItemActions } from "./list/block-list-context";
import { useBlockList } from "./list/use-block-list";
import { useBlockFocusActions } from "./navigation/use-block-focus-actions";
import { useBlockNavigation } from "./navigation/use-block-navigation";
import { useOpenBlockRequest } from "./navigation/use-open-block-request";
import { useBlockMutations } from "./use-block-mutations";
import { useWorkspaceViewState } from "./use-workspace-view-state";

interface UseWorkspaceBlockOrchestratorResult {
  blockList: ReturnType<typeof useBlockList>;
  blockMutations: ReturnType<typeof useBlockMutations>;
  createBlockWithFocus: () => Promise<void>;
  editorRegistry: ReturnType<typeof useEditorRegistry>;
  itemActions: BlockListItemActions;
  registryContextValue: {
    getEditor: ReturnType<typeof useEditorRegistry>["getEditor"];
    registerEditor: ReturnType<typeof useEditorRegistry>["registerEditor"];
  };
  tagData: ReturnType<typeof useTagData>;
  viewState: ReturnType<typeof useWorkspaceViewState>;
  blockNavigation: ReturnType<typeof useBlockNavigation>;
  handleCreateTagForFilter: (name: string) => Promise<void>;
  handleDeleteTag: (tagId: string) => Promise<void>;
}

export function useWorkspaceBlockOrchestrator(): UseWorkspaceBlockOrchestratorResult {
  // Source-of-truth route view state (visibility + selected tags).
  const viewState = useWorkspaceViewState();

  // Data/query capabilities for the current workspace view.
  const blockList = useBlockList({
    visibility: viewState.visibility,
    tagIds: viewState.selectedTagIds,
  });

  // Mutation and auxiliary domain services used by the workspace page.
  const blockMutations = useBlockMutations();
  const tagData = useTagData();
  const editorRegistry = useEditorRegistry();
  const { sessionsByBlockId } = useExternalEditSessions();

  // Navigation coordinator that bridges list data and editor focus targets.
  const blockNavigation = useBlockNavigation({
    registry: editorRegistry,
    visibility: viewState.visibility,
    selectedTagIds: viewState.selectedTagIds,
    setVisibility: viewState.setVisibility,
    setSelectedTagIds: viewState.setSelectedTagIds,
    getBlockAtIndex: blockList.getBlockAtIndex,
    ensureBlockIndexLoaded: blockList.ensureBlockIndexLoaded,
    locateBlockInView: blockList.locateBlockInView,
  });

  // Focus-aware create/delete actions used by shortcuts and UI buttons.
  const { createBlockWithFocus, deleteBlockWithFocus } = useBlockFocusActions({
    activeBlockId: blockNavigation.activeBlockId,
    totalBlockCount: blockList.totalBlockCount,
    createBlock: async () => {
      const block = await blockMutations.createBlock();
      if (viewState.selectedTagIds.length > 0) {
        return await blockMutations.assignBlockTags(block.id, viewState.selectedTagIds);
      }
      return block;
    },
    deleteBlock: blockMutations.deleteBlock,
    navigateToBlock: blockNavigation.navigateToBlock,
    navigateToIndex: blockNavigation.navigateToIndex,
    locateBlockInView: blockList.locateBlockInView,
    setActiveBlockId: blockNavigation.setActiveBlockId,
  });

  // Global workspace shortcuts are bound to the current active editor block.
  useBlockShortcuts({
    activeBlockId: blockNavigation.activeBlockId,
    createBlockWithFocus,
    deleteBlockWithFocus,
  });

  // External edit actions depend on editor content and block navigation.
  const externalEditActions = useExternalEditActions({
    getEditor: editorRegistry.getEditor,
    navigateToBlock: blockNavigation.navigateToBlock,
  });

  // Bridge pending "open block" requests from external entrypoints to navigation.
  const { acknowledgePendingBlockId, pendingBlockId } = useOpenBlockRequest();
  useEffect(() => {
    if (!pendingBlockId) {
      return;
    }

    blockNavigation.navigateToBlock(pendingBlockId, {
      acknowledge: () => {
        acknowledgePendingBlockId(pendingBlockId);
      },
      onNotFound: () => undefined,
      viewMode: "active-unfiltered",
    });
  }, [acknowledgePendingBlockId, blockNavigation.navigateToBlock, pendingBlockId]);

  // Block-level action handlers consumed by list item actions.
  const handleArchiveBlock = useCallback(
    (blockId: string) => {
      void blockMutations.archiveBlock(blockId);
    },
    [blockMutations.archiveBlock],
  );

  const handleRestoreBlock = useCallback(
    (blockId: string) => {
      void blockMutations.restoreBlock(blockId);
    },
    [blockMutations.restoreBlock],
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      void deleteBlockWithFocus(blockId);
    },
    [deleteBlockWithFocus],
  );

  // Tag filter actions keep selected tags in sync with tag CRUD operations.
  const handleCreateTagForFilter = useCallback(
    async (name: string) => {
      const createdTag = await tagData.createTag(name);
      viewState.setSelectedTagIds((currentTagIds) => {
        if (currentTagIds.includes(createdTag.id)) {
          return currentTagIds;
        }
        return [...currentTagIds, createdTag.id];
      });
    },
    [tagData.createTag, viewState.setSelectedTagIds],
  );

  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      await tagData.deleteTag(tagId);
      viewState.setSelectedTagIds((currentTagIds) => currentTagIds.filter((id) => id !== tagId));
    },
    [tagData.deleteTag, viewState.setSelectedTagIds],
  );

  // Provider-facing editor registry adapter for deeply nested block editors.
  const registryContextValue = useMemo(
    () => ({
      registerEditor: editorRegistry.registerEditor,
      getEditor: editorRegistry.getEditor,
    }),
    [editorRegistry.registerEditor, editorRegistry.getEditor],
  );

  // Unified list item action model consumed by the virtualized block list.
  const itemActions = useMemo<BlockListItemActions>(
    () => ({
      tags: tagData.tags,
      visibility: viewState.visibility,
      sessionsByBlockId,
      pendingExternalEditIds: externalEditActions.pendingExternalEditIds,
      isBlockLocked: blockMutations.isBlockLocked,
      isBlockOpPending: blockMutations.isBlockOpPending,
      isTagCreatePending: tagData.isTagOpPending("create"),
      onArchive: handleArchiveBlock,
      onRestore: handleRestoreBlock,
      onDelete: handleDeleteBlock,
      onCreateTag: tagData.createTag,
      onAssignTags: blockMutations.assignBlockTags,
      onCancelExternalEdit: externalEditActions.handleCancelExternalEdit,
      onSubmitExternalEdit: externalEditActions.handleSubmitExternalEdit,
      onFocus: blockNavigation.setActiveBlockId,
    }),
    [
      tagData.tags,
      viewState.visibility,
      sessionsByBlockId,
      externalEditActions.pendingExternalEditIds,
      blockMutations.isBlockLocked,
      blockMutations.isBlockOpPending,
      tagData.isTagOpPending,
      handleArchiveBlock,
      handleRestoreBlock,
      handleDeleteBlock,
      tagData.createTag,
      blockMutations.assignBlockTags,
      externalEditActions.handleCancelExternalEdit,
      externalEditActions.handleSubmitExternalEdit,
      blockNavigation.setActiveBlockId,
    ],
  );

  // Return a compact orchestration contract for the page component.
  return {
    blockList,
    blockMutations,
    createBlockWithFocus,
    editorRegistry,
    itemActions,
    registryContextValue,
    tagData,
    viewState,
    blockNavigation,
    handleCreateTagForFilter,
    handleDeleteTag,
  };
}
