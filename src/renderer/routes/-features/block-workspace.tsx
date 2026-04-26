import { Trans } from "@lingui/react/macro";
import { toAppInvokeError } from "@renderer/app/invoke";
import { queryClient } from "@renderer/app/query";
import { cancelExternalEdit, submitExternalEdit, type ListBlocksResult } from "@renderer/clients";
import { useOpenBlockTarget } from "@renderer/routes/-features/open-block-target";
import { useBlockShortcuts } from "@renderer/routes/-features/use-block-shortcuts";
import { useBlockWorkspace } from "@renderer/routes/-features/use-block-workspace";
import { useExternalEditSessions } from "@renderer/routes/-features/use-external-edit-sessions";
import { useOpenBlockRequest } from "@renderer/routes/-features/use-open-block-request";
import {
  VirtualBlockList,
  type VirtualBlockListHandle,
} from "@renderer/routes/-features/virtual-block-list";
import { WorkspaceTagFilterPortal } from "@renderer/routes/-features/workspace-tag-filter-portal";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

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
  const {
    loadedBlocks,
    totalBlockCount,
    tags,
    visibility,
    selectedTagIds,
    isInitialLoading,
    isCreatingBlock,
    isBlockLocked,
    isBlockOpPending,
    isTagOpPending,
    createBlock,
    archiveBlock,
    restoreBlock,
    deleteBlock,
    createTagAndAssignToBlock,
    assignBlockTags,
    getBlockAtIndex,
    ensureBlockIndex,
    ensureBlockIndexLoaded,
    locateBlockInView,
    setVisibility,
    setSelectedTagFilters,
  } = useBlockWorkspace();
  const { sessionsByBlockId } = useExternalEditSessions();
  const [pendingExternalEditIds, setPendingExternalEditIds] = useState<Set<string>>(
    () => new Set(),
  );
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
    loadedBlocks,
    totalBlockCount,
    createBlock,
    deleteBlock,
    getBlockAtIndex,
    ensureBlockIndexLoaded,
    locateBlockInView,
    scrollToBlockIndex,
  });

  const { acknowledgePendingBlockId, pendingBlockId } = useOpenBlockRequest();

  useOpenBlockTarget({
    pendingBlockId,
    onSetVisibility: setVisibility,
    onClearFilters: () => setSelectedTagFilters([]),
    onFocus: requestLocatedBlockFocus,
    onAcknowledge: acknowledgePendingBlockId,
  });

  const handleArchiveBlock = useCallback(
    (blockId: string) => {
      void archiveBlock(blockId);
    },
    [archiveBlock],
  );

  const handleRestoreBlock = useCallback(
    (blockId: string) => {
      void restoreBlock(blockId);
    },
    [restoreBlock],
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      void deleteBlockWithFocus(blockId);
    },
    [deleteBlockWithFocus],
  );

  const handleCreateTag = useCallback(
    async (blockId: string, name: string) => {
      await createTagAndAssignToBlock(blockId, name);
    },
    [createTagAndAssignToBlock],
  );

  const handleAssignTags = useCallback(
    async (blockId: string, tagIds: string[]) => {
      await assignBlockTags(blockId, tagIds);
    },
    [assignBlockTags],
  );

  const handleCancelExternalEdit = useCallback(async (editId: string) => {
    setPendingExternalEditIds((current) => new Set(current).add(editId));
    try {
      await cancelExternalEdit({ editId });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setPendingExternalEditIds((current) => {
        const next = new Set(current);
        next.delete(editId);
        return next;
      });
    }
  }, []);

  const handleSubmitExternalEdit = useCallback(
    async (blockId: string, editId: string) => {
      setPendingExternalEditIds((current) => new Set(current).add(editId));
      try {
        const editorContent = await editorRefs.current.get(blockId)?.flushPendingMarkdown();
        let content = editorContent;
        if (content === undefined) {
          for (const [, cached] of queryClient.getQueriesData<ListBlocksResult>({
            queryKey: ["blocks"],
          })) {
            const found = cached?.blocks.find((b) => b.id === blockId);
            if (found) {
              content = found.content;
              break;
            }
          }
        }
        if (content === undefined) {
          toast.error("Cannot submit: block content unavailable.");
          return;
        }
        await submitExternalEdit({ content, editId });
        void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        setPendingExternalEditIds((current) => {
          const next = new Set(current);
          next.delete(editId);
          return next;
        });
      }
    },
    [editorRefs],
  );

  if (isInitialLoading) {
    return <LoadingState />;
  }

  if (visibility === "active" && totalBlockCount === 0 && selectedTagIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <WorkspaceTagFilterPortal />
        <EmptyWorkspace isCreatingBlock={isCreatingBlock} onCreateBlock={createBlockWithFocus} />
      </div>
    );
  }

  return (
    <section className="z-10 mx-auto flex w-full max-w-4xl flex-col gap-4">
      <WorkspaceTagFilterPortal />
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
        <VirtualBlockList
          ref={blockListRef}
          totalCount={totalBlockCount}
          getBlockAtIndex={getBlockAtIndex}
          ensureBlockIndex={ensureBlockIndex}
          tags={tags}
          visibility={visibility}
          sessionsByBlockId={sessionsByBlockId}
          pendingExternalEditIds={pendingExternalEditIds}
          registerEditorRef={registerEditorRef}
          isBlockLocked={isBlockLocked}
          isBlockOpPending={isBlockOpPending}
          isTagOpPending={isTagOpPending}
          onArchiveBlock={handleArchiveBlock}
          onRestoreBlock={handleRestoreBlock}
          onDeleteBlock={handleDeleteBlock}
          onCreateTag={handleCreateTag}
          onAssignTags={handleAssignTags}
          onCancelExternalEdit={handleCancelExternalEdit}
          onSubmitExternalEdit={handleSubmitExternalEdit}
          onFocusBlock={setActiveBlockId}
        />
      )}

      {visibility === "active" ? (
        <div className="flex justify-center">
          <Button
            className="gap-2"
            disabled={isCreatingBlock}
            onClick={() => {
              void createBlockWithFocus();
            }}
          >
            {isCreatingBlock ? (
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
