import { Trans } from "@lingui/react/macro";
import { useTagData } from "@renderer/features/tag/use-tag-data";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo } from "react";

import { BlockListItemActionsProvider, type BlockListItemActions } from "./block-list-context";
import { EditorRegistryProvider } from "./editor-registry-context";
import { useBlockList } from "./use-block-list";
import { useBlockMutations } from "./use-block-mutations";
import { useBlockNavigation } from "./use-block-navigation";
import { useBlockShortcuts } from "./use-block-shortcuts";
import { useEditorRegistry } from "./use-editor-registry";
import { useExternalEditActions } from "./use-external-edit-actions";
import { useExternalEditSessions } from "./use-external-edit-sessions";
import { useOpenBlockRequest } from "./use-open-block-request";
import { useWorkspaceViewState } from "./use-workspace-view-state";
import { VirtualBlockList } from "./virtual-block-list";
import { WorkspaceTagFilterPortal } from "./workspace-tag-filter-portal";

function LoadingState(): ReactElement {
  return (
    <section className="mx-auto flex min-h-[45dvh] w-full max-w-4xl items-center justify-center">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        <Trans id="workspace.loading">Loading your blocks...</Trans>
      </div>
    </section>
  );
}

function EmptyWorkspace({
  onCreateBlock,
  isCreatingBlock,
}: {
  onCreateBlock: () => Promise<void>;
  isCreatingBlock: boolean;
}) {
  return (
    <section className="border-border/70 bg-card mx-auto flex min-h-[40dvh] w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <h1 className="text-lg font-semibold">
        <Trans id="workspace.empty.title">No blocks yet</Trans>
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        <Trans id="workspace.empty.description">Start with an empty block.</Trans>
      </p>
      <Button
        className="mt-5 gap-2"
        disabled={isCreatingBlock}
        onClick={() => {
          void onCreateBlock();
        }}
      >
        {isCreatingBlock ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <PlusIcon className="size-4" />
        )}
        <Trans id="workspace.empty.action">Create first block</Trans>
      </Button>
    </section>
  );
}

function ArchivedEmptyState() {
  return (
    <section className="border-border/70 bg-card mx-auto flex min-h-[40dvh] w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <h1 className="text-lg font-semibold">
        <Trans id="workspace.archived.empty.title">No archived blocks</Trans>
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        <Trans id="workspace.archived.empty.description">
          Archived blocks will appear here until you restore them.
        </Trans>
      </p>
    </section>
  );
}

export function BlockWorkspace() {
  const viewState = useWorkspaceViewState();
  const blockList = useBlockList({
    visibility: viewState.visibility,
    tagIds: viewState.selectedTagIds,
  });
  const blockMutations = useBlockMutations();
  const tagData = useTagData();
  const { sessionsByBlockId } = useExternalEditSessions();

  const editorRegistry = useEditorRegistry();
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

  const { createBlockWithFocus, deleteBlockWithFocus } = useBlockShortcuts({
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

  const externalEditActions = useExternalEditActions({
    getEditor: editorRegistry.getEditor,
    navigateToBlock: blockNavigation.navigateToBlock,
  });

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

  const registryContextValue = useMemo(
    () => ({
      registerEditor: editorRegistry.registerEditor,
      getEditor: editorRegistry.getEditor,
    }),
    [editorRegistry.registerEditor, editorRegistry.getEditor],
  );

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

  if (blockList.isInitialLoading) {
    return <LoadingState />;
  }

  const { visibility, selectedTagIds } = viewState;
  const { totalBlockCount } = blockList;

  if (visibility === "active" && totalBlockCount === 0 && selectedTagIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <WorkspaceTagFilterPortal
          tags={tagData.tags}
          visibility={visibility}
          selectedTagIds={selectedTagIds}
          isTagOpPending={tagData.isTagOpPending}
          onSetVisibility={viewState.setVisibility}
          onSetSelectedTagIds={viewState.setSelectedTagIds}
          onCreateTag={handleCreateTagForFilter}
          onDeleteTag={handleDeleteTag}
        />
        <EmptyWorkspace
          isCreatingBlock={blockMutations.isCreatingBlock}
          onCreateBlock={createBlockWithFocus}
        />
      </div>
    );
  }

  return (
    <section className="z-10 mx-auto flex w-full max-w-4xl flex-col gap-4">
      <WorkspaceTagFilterPortal
        tags={tagData.tags}
        visibility={visibility}
        selectedTagIds={selectedTagIds}
        isTagOpPending={tagData.isTagOpPending}
        onSetVisibility={viewState.setVisibility}
        onSetSelectedTagIds={viewState.setSelectedTagIds}
        onCreateTag={handleCreateTagForFilter}
        onDeleteTag={handleDeleteTag}
      />
      {totalBlockCount === 0 ? (
        visibility === "archived" && selectedTagIds.length === 0 ? (
          <ArchivedEmptyState />
        ) : (
          <div className="border-border/70 bg-card rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">
              {visibility === "active" ? (
                <Trans id="workspace.filtered.empty.title">No blocks match the selected tags</Trans>
              ) : (
                <Trans id="workspace.archived.filtered.empty.title">
                  No archived blocks match the selected tags
                </Trans>
              )}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {visibility === "active" ? (
                <Trans id="workspace.filtered.empty.description">
                  Clear one of the filters or create a new block outside the current tag selection.
                </Trans>
              ) : (
                <Trans id="workspace.archived.filtered.empty.description">
                  Clear one of the filters or switch back to active blocks.
                </Trans>
              )}
            </p>
          </div>
        )
      ) : (
        <EditorRegistryProvider value={registryContextValue}>
          <BlockListItemActionsProvider value={itemActions}>
            <VirtualBlockList
              totalCount={totalBlockCount}
              getBlockAtIndex={blockList.getBlockAtIndex}
              ensureBlockIndex={blockList.ensureBlockIndex}
              scrollTarget={blockNavigation.scrollTarget}
              onScrollTargetRendered={blockNavigation.targetRendered}
            />
          </BlockListItemActionsProvider>
        </EditorRegistryProvider>
      )}

      {visibility === "active" ? (
        <div className="flex justify-center">
          <Button
            className="gap-2"
            disabled={blockMutations.isCreatingBlock}
            onClick={() => {
              void createBlockWithFocus();
            }}
          >
            {blockMutations.isCreatingBlock ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            <Trans id="workspace.add-block">Add block</Trans>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
