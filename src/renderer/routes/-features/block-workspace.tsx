import { Trans } from "@lingui/react/macro";
import { useTagData } from "@renderer/features/tag/use-tag-data";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useMemo, useRef } from "react";

import { BlockListItemActionsProvider, type BlockListItemActions } from "./block-list-context";
import { useOpenBlockTarget } from "./open-block-target";
import { useBlockList } from "./use-block-list";
import { useBlockMutations } from "./use-block-mutations";
import { useBlockShortcuts } from "./use-block-shortcuts";
import { useExternalEditActions } from "./use-external-edit-actions";
import { useExternalEditSessions } from "./use-external-edit-sessions";
import { useOpenBlockRequest } from "./use-open-block-request";
import { useWorkspaceViewState } from "./use-workspace-view-state";
import { VirtualBlockList, type VirtualBlockListHandle } from "./virtual-block-list";
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

  const blockListRef = useRef<VirtualBlockListHandle | null>(null);
  const scrollToBlockIndex = useCallback((index: number) => {
    blockListRef.current?.scrollToIndex(index);
  }, []);

  const {
    editorRefs,
    registerEditorRef,
    createBlockWithFocus,
    deleteBlockWithFocus,
    setActiveBlockId,
    requestLocatedBlockFocus,
  } = useBlockShortcuts({
    loadedBlocks: blockList.loadedBlocks,
    totalBlockCount: blockList.totalBlockCount,
    createBlock: async () => {
      const block = await blockMutations.createBlock();
      if (viewState.selectedTagIds.length > 0) {
        return await blockMutations.assignBlockTags(block.id, viewState.selectedTagIds);
      }
      return block;
    },
    deleteBlock: blockMutations.deleteBlock,
    getBlockAtIndex: blockList.getBlockAtIndex,
    ensureBlockIndexLoaded: blockList.ensureBlockIndexLoaded,
    locateBlockInView: blockList.locateBlockInView,
    scrollToBlockIndex,
  });

  const externalEditActions = useExternalEditActions({ editorRefs });

  const { acknowledgePendingBlockId, pendingBlockId } = useOpenBlockRequest();

  useOpenBlockTarget({
    pendingBlockId,
    onSetVisibility: viewState.setVisibility,
    onClearFilters: () => viewState.setSelectedTagIds([]),
    onFocus: requestLocatedBlockFocus,
    onAcknowledge: acknowledgePendingBlockId,
  });

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

  const itemActions = useMemo<BlockListItemActions>(
    () => ({
      tags: tagData.tags,
      visibility: viewState.visibility,
      sessionsByBlockId,
      pendingExternalEditIds: externalEditActions.pendingExternalEditIds,
      registerEditorRef,
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
      onFocus: setActiveBlockId,
    }),
    [
      tagData.tags,
      viewState.visibility,
      sessionsByBlockId,
      externalEditActions.pendingExternalEditIds,
      registerEditorRef,
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
      setActiveBlockId,
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
        <BlockListItemActionsProvider value={itemActions}>
          <VirtualBlockList
            ref={blockListRef}
            totalCount={totalBlockCount}
            getBlockAtIndex={blockList.getBlockAtIndex}
            ensureBlockIndex={blockList.ensureBlockIndex}
          />
        </BlockListItemActionsProvider>
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
