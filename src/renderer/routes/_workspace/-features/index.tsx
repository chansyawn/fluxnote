import { Trans } from "@lingui/react/macro";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";

import { EditorRegistryProvider } from "./editing/editor-registry-context";
import { BlockListItemActionsProvider } from "./list/block-list-context";
import { VirtualBlockList } from "./list/virtual-block-list";
import { useWorkspaceBlockOrchestrator } from "./use-workspace-block-orchestrator";
import { ArchivedEmptyState, EmptyWorkspace, LoadingState } from "./view/workspace-empty-state";
import { WorkspaceTagFilterPortal } from "./view/workspace-tag-filter-portal";

export function BlockWorkspace() {
  const {
    blockList,
    blockMutations,
    blockNavigation,
    createBlockWithFocus,
    handleCreateTagForFilter,
    handleDeleteTag,
    itemActions,
    registryContextValue,
    tagData,
    viewState,
  } = useWorkspaceBlockOrchestrator();

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
