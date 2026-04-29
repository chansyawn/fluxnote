import { Trans } from "@lingui/react/macro";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { EditorRegistryProvider } from "./editing/editor-registry-context";
import { VirtualBlockList } from "./list/virtual-block-list";
import { ArchivedEmptyState, EmptyWorkspace, LoadingState } from "./view/workspace-empty-state";
import { WorkspaceTagFilterPortal } from "./view/workspace-tag-filter-portal";
import { useWorkspaceDataBoundary } from "./workspace-data-boundary";
import { WorkspaceRuntimeProvider } from "./workspace-runtime-context";

export function BlockWorkspace() {
  const {
    blockList,
    blockMutations,
    blockNavigation,
    commands,
    editorRegistry,
    runtimeContextValue,
    tagData,
    viewState,
  } = useWorkspaceDataBoundary();
  const registryContextValue = useMemo(
    () => ({
      getEditor: editorRegistry.getEditor,
      registerEditor: editorRegistry.registerEditor,
    }),
    [editorRegistry.getEditor, editorRegistry.registerEditor],
  );

  if (blockList.isInitialLoading) {
    return <LoadingState />;
  }

  const { visibility, selectedTagIds } = viewState;
  const { totalBlockCount } = blockList;
  const tagFilter = (
    <WorkspaceTagFilterPortal
      tags={tagData.tags}
      visibility={visibility}
      selectedTagIds={selectedTagIds}
      isTagOpPending={tagData.isTagOpPending}
      onSetVisibility={viewState.setVisibility}
      onSetSelectedTagIds={viewState.setSelectedTagIds}
      onCreateTag={async (name) => {
        const createdTag = await commands.createTag(name);
        viewState.setSelectedTagIds((currentTagIds) => {
          if (currentTagIds.includes(createdTag.id)) {
            return currentTagIds;
          }
          return [...currentTagIds, createdTag.id];
        });
      }}
      onDeleteTag={async (tagId) => {
        await commands.deleteTag(tagId);
        viewState.setSelectedTagIds((currentTagIds) => currentTagIds.filter((id) => id !== tagId));
      }}
    />
  );

  if (visibility === "active" && totalBlockCount === 0 && selectedTagIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {tagFilter}
        <EmptyWorkspace
          isCreatingBlock={blockMutations.isCreatingBlock}
          onCreateBlock={commands.createBlockWithFocus}
        />
      </div>
    );
  }

  return (
    <section className="z-10 mx-auto flex w-full max-w-4xl flex-col gap-4">
      {tagFilter}
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
        <WorkspaceRuntimeProvider value={runtimeContextValue}>
          <EditorRegistryProvider value={registryContextValue}>
            <VirtualBlockList
              totalCount={totalBlockCount}
              getBlockAtIndex={blockList.getBlockAtIndex}
              ensureBlockRange={blockList.ensureBlockRange}
              scrollTarget={blockNavigation.scrollTarget}
              onScrollTargetRendered={blockNavigation.targetRendered}
            />
          </EditorRegistryProvider>
        </WorkspaceRuntimeProvider>
      )}

      {visibility === "active" ? (
        <div className="flex justify-center">
          <Button
            className="gap-2"
            disabled={blockMutations.isCreatingBlock}
            onClick={() => {
              void commands.createBlockWithFocus();
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
