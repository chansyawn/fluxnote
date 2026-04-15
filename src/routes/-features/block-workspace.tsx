import { Trans } from "@lingui/react/macro";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

import { BlockActionBar } from "@/features/note-block/block-action-bar";
import { BlockArchiveAction } from "@/features/note-block/block-archive-action";
import { BlockCopyAction } from "@/features/note-block/block-copy-action";
import { BlockDeleteAction } from "@/features/note-block/block-delete-action";
import { BlockTagAction } from "@/features/note-block/block-tag-action";
import { NoteBlockEditor } from "@/features/note-block/note-block-editor";
import { useBlockShortcuts } from "@/routes/-features/use-block-shortcuts";
import { useBlockWorkspace } from "@/routes/-features/use-block-workspace";
import { useDeepLink } from "@/routes/-features/use-deep-link";
import { WorkspaceTagFilterPortal } from "@/routes/-features/workspace-tag-filter-portal";
import { Button } from "@/ui/components/button";

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
    blocks,
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
  } = useBlockWorkspace();
  const {
    createBlockWithFocus,
    deleteBlockWithFocus,
    focusRequest,
    setActiveBlockId,
    requestBlockFocus,
  } = useBlockShortcuts({
    blocks,
    createBlock,
    deleteBlock,
  });

  const { pendingBlockId, clearPendingBlockId } = useDeepLink();

  // Handle deep link focus request
  useEffect(() => {
    if (!pendingBlockId || isInitialLoading) {
      return;
    }

    console.log("Processing deep link for block:", pendingBlockId);

    // Check if block exists in current view
    const blockExists = blocks.some((block) => block.id === pendingBlockId);

    if (blockExists) {
      requestBlockFocus(pendingBlockId);
      clearPendingBlockId();
    } else {
      // Block not found in current view
      toast.error("Block not found", {
        description: "The requested block does not exist or has been archived.",
      });
      clearPendingBlockId();
    }
  }, [pendingBlockId, blocks, isInitialLoading, requestBlockFocus, clearPendingBlockId]);

  if (isInitialLoading) {
    return <LoadingState />;
  }

  if (visibility === "active" && blocks.length === 0 && selectedTagIds.length === 0) {
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
      {blocks.length === 0 ? (
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
        <div className="flex flex-col gap-3 pt-2">
          {blocks.map((block) => {
            const isActionGroupDisabled = isBlockLocked(block.id);

            return (
              <NoteBlockEditor
                key={block.id}
                actions={({ popupContainer, onCopy }) => (
                  <BlockActionBar disabled={isActionGroupDisabled}>
                    <BlockCopyAction isDisabled={isActionGroupDisabled} onCopy={onCopy} />
                    <BlockTagAction
                      isCreatingTag={isTagOpPending("create")}
                      isDisabled={isActionGroupDisabled}
                      popupContainer={popupContainer}
                      selectedTagIds={block.tags.map((tag) => tag.id)}
                      tags={tags}
                      onCreateTag={async (name) => {
                        await createTagAndAssignToBlock(block.id, name);
                      }}
                      onSelectedTagIdsChange={async (tagIds) => {
                        await assignBlockTags(block.id, tagIds);
                      }}
                    />
                    <BlockArchiveAction
                      isDisabled={isActionGroupDisabled}
                      isPending={isBlockOpPending(
                        block.id,
                        visibility === "active" ? "archive" : "restore",
                      )}
                      visibility={visibility}
                      onClick={() => {
                        void (visibility === "active"
                          ? archiveBlock(block.id)
                          : restoreBlock(block.id));
                      }}
                    />
                    <BlockDeleteAction
                      isDeleting={isBlockOpPending(block.id, "delete")}
                      isDisabled={isActionGroupDisabled}
                      onClick={() => {
                        void deleteBlockWithFocus(block.id);
                      }}
                    />
                  </BlockActionBar>
                )}
                block={block}
                focusRequestKey={focusRequest?.blockId === block.id ? focusRequest.requestKey : 0}
                onFocus={setActiveBlockId}
              />
            );
          })}
        </div>
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
