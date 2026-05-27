import { BlockEditorToolbar } from "@renderer/features/block-editor";
import { useMemo } from "react";

import { BlockEditorRegistryProvider } from "./editor-registry/block-editor-registry-context";
import { VirtualBlockList } from "./list/virtual-block-list";
import {
  LoadingState,
  WorkspaceArchivedEmptyState,
  WorkspaceEmptyState,
  WorkspaceFilteredEmptyState,
} from "./view/workspace-empty-state";
import { WorkspaceTitlebarActionsPortal } from "./view/workspace-titlebar-actions-portal";
import { useWorkspaceRuntime } from "./workspace-runtime";
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
  } = useWorkspaceRuntime();
  const registryContextValue = useMemo(
    () => ({
      getEditor: editorRegistry.getEditor,
      registerEditor: editorRegistry.registerEditor,
    }),
    [editorRegistry.getEditor, editorRegistry.registerEditor],
  );

  const { visibility, selectedTagIds } = viewState;
  const { totalBlockCount } = blockList;
  const tagFilter = (
    <WorkspaceTitlebarActionsPortal
      tags={tagData.tags}
      visibility={visibility}
      isCreatingBlock={blockMutations.isCreatingBlock}
      selectedTagIds={selectedTagIds}
      isTagOpPending={tagData.isTagOpPending}
      onCreateBlock={() => commands.createBlockWithFocus("workspace_titlebar")}
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

  const workspaceContent = (() => {
    if (blockList.isInitialLoading) {
      return <LoadingState />;
    }

    if (visibility === "active" && totalBlockCount === 0 && selectedTagIds.length === 0) {
      return (
        <>
          {tagFilter}
          <WorkspaceEmptyState
            isCreatingBlock={blockMutations.isCreatingBlock}
            onCreateBlock={() => commands.createBlockWithFocus("workspace_empty_state")}
          />
        </>
      );
    }

    return (
      <>
        {tagFilter}
        {totalBlockCount === 0 ? (
          visibility === "archived" && selectedTagIds.length === 0 ? (
            <WorkspaceArchivedEmptyState />
          ) : (
            <WorkspaceFilteredEmptyState visibility={visibility} />
          )
        ) : (
          <WorkspaceStateProvider value={workspaceContextValue}>
            <BlockEditorRegistryProvider value={registryContextValue}>
              <VirtualBlockList
                totalCount={totalBlockCount}
                getBlockAtIndex={blockList.getBlockAtIndex}
                ensureBlockRange={blockList.ensureBlockRange}
                scrollTarget={blockNavigation.scrollTarget}
                onScrollTargetRendered={blockNavigation.targetRendered}
              />
            </BlockEditorRegistryProvider>
          </WorkspaceStateProvider>
        )}
      </>
    );
  })();

  return (
    <section
      className="z-10 mx-auto flex h-full min-h-0 w-full flex-1 flex-col"
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          commands.focusBlock(null);
        }
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full flex-col gap-4">{workspaceContent}</div>
      </div>
      <div className="shrink-0 pt-2">
        <BlockEditorToolbar controller={editorRegistry.activeEditor} />
      </div>
    </section>
  );
}
