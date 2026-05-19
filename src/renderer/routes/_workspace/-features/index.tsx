import { useMemo } from "react";

import { EditorRegistryProvider } from "./editing/editor-registry-context";
import { VirtualBlockList } from "./list/virtual-block-list";
import {
  LoadingState,
  WorkspaceArchivedEmptyState,
  WorkspaceEmptyState,
  WorkspaceFilteredEmptyState,
} from "./view/workspace-empty-state";
import { WorkspaceTitlebarActionsPortal } from "./view/workspace-titlebar-actions-portal";
import { useWorkspaceDataBoundary } from "./workspace-data-boundary";
import { WorkspaceStateProvider } from "./workspace-state-context";

export function BlockWorkspace() {
  const {
    blockList,
    blockMutations,
    blockNavigation,
    commands,
    editorRegistry,
    tagData,
    viewState,
    workspaceContextValue,
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
    <WorkspaceTitlebarActionsPortal
      tags={tagData.tags}
      visibility={visibility}
      isCreatingBlock={blockMutations.isCreatingBlock}
      selectedTagIds={selectedTagIds}
      isTagOpPending={tagData.isTagOpPending}
      onCreateBlock={commands.createBlockWithFocus}
      onSetVisibility={viewState.setVisibility}
      onSetSelectedTagIds={viewState.setSelectedTagIds}
      onCreateTag={async (name) => {
        const createdTag = await commands.createTag(name);
        viewState.addTagFilter(createdTag.id);
      }}
      onDeleteTag={async (tagId) => {
        await commands.deleteTag(tagId);
        viewState.removeTagFilter(tagId);
      }}
    />
  );

  if (visibility === "active" && totalBlockCount === 0 && selectedTagIds.length === 0) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col gap-4">
        {tagFilter}
        <WorkspaceEmptyState
          isCreatingBlock={blockMutations.isCreatingBlock}
          onCreateBlock={commands.createBlockWithFocus}
        />
      </div>
    );
  }

  return (
    <section className="z-10 mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col gap-4">
      {tagFilter}
      {totalBlockCount === 0 ? (
        visibility === "archived" && selectedTagIds.length === 0 ? (
          <WorkspaceArchivedEmptyState />
        ) : (
          <WorkspaceFilteredEmptyState visibility={visibility} />
        )
      ) : (
        <WorkspaceStateProvider value={workspaceContextValue}>
          <EditorRegistryProvider value={registryContextValue}>
            <VirtualBlockList
              totalCount={totalBlockCount}
              getBlockAtIndex={blockList.getBlockAtIndex}
              ensureBlockRange={blockList.ensureBlockRange}
              scrollTarget={blockNavigation.scrollTarget}
              onScrollTargetRendered={blockNavigation.targetRendered}
            />
          </EditorRegistryProvider>
        </WorkspaceStateProvider>
      )}
    </section>
  );
}
