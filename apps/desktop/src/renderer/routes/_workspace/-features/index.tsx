import type { I18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import { BlockEditorToolbar } from "@renderer/features/block-editor";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { cn } from "@renderer/ui/lib/utils";
import { useMemo } from "react";

import { BlockEditorRegistryProvider } from "./editor-registry/block-editor-registry-context";
import { pickBlockEditorShortcuts } from "./editor/workspace-block-editor-surface";
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

function formatWorkspaceToolbarBlockCountLabel(i18n: I18n, count: number) {
  if (count === 1) {
    return i18n._({
      id: "workspace.toolbar.block-count.one",
      message: "1 block",
    });
  }

  const formattedCount = new Intl.NumberFormat(i18n.locale).format(count);
  const label = i18n._({
    id: "workspace.toolbar.block-count.other",
    message: "{count} blocks",
    values: { count: formattedCount },
  });
  return label.replace("{count}", formattedCount);
}

export function BlockWorkspace() {
  const { i18n } = useLingui();
  const { shortcuts } = useShortcutState();
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
  const toolbarShortcuts = useMemo(() => pickBlockEditorShortcuts(shortcuts), [shortcuts]);

  const { visibility, selectedTagIds } = viewState;
  const { totalBlockCount } = blockList;
  const shouldShowBottomToolbar = totalBlockCount > 0;

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
      className="z-10 mx-auto flex min-h-full w-full flex-col"
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          commands.focusBlock(null);
        }
      }}
    >
      <div className="mx-auto flex w-full flex-1 flex-col gap-4 pb-3">{workspaceContent}</div>
      {shouldShowBottomToolbar ? (
        <div className="pointer-events-none sticky bottom-0 z-20 -mt-14 flex h-24 shrink-0 items-end justify-center pb-2">
          <div
            aria-hidden="true"
            className={cn(
              "fixed inset-x-0 bottom-0 z-0 h-16",
              "from-background/80 via-background/40 to-background/0 bg-linear-to-t",
            )}
          />
          <BlockEditorToolbar
            className="pointer-events-auto relative z-10"
            controller={editorRegistry.activeEditor}
            shortcuts={toolbarShortcuts}
            inactiveContent={
              blockList.isInitialLoading ? null : (
                <div className="text-muted-foreground/70 pointer-events-none relative z-10 mx-auto mb-2 text-xs font-medium select-none">
                  {formatWorkspaceToolbarBlockCountLabel(i18n, totalBlockCount)}
                </div>
              )
            }
          />
        </div>
      ) : null}
    </section>
  );
}
