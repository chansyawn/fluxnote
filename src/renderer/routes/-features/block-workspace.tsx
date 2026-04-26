import { Trans } from "@lingui/react/macro";
import { toAppInvokeError } from "@renderer/app/invoke";
import { queryClient } from "@renderer/app/query";
import { cancelExternalEdit, submitExternalEdit } from "@renderer/clients";
import { BlockActions } from "@renderer/features/note-block/block-actions";
import { BlockExternalEditActions } from "@renderer/features/note-block/block-external-edit-actions";
import { NoteBlockEditor } from "@renderer/features/note-block/note-block-editor";
import { useBlockShortcuts } from "@renderer/routes/-features/use-block-shortcuts";
import { useBlockWorkspace } from "@renderer/routes/-features/use-block-workspace";
import { useExternalEditSessions } from "@renderer/routes/-features/use-external-edit-sessions";
import { useOpenBlockRequest } from "@renderer/routes/-features/use-open-block-request";
import { WorkspaceTagFilterPortal } from "@renderer/routes/-features/workspace-tag-filter-portal";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
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
    blocks,
    tags,
    visibility,
    selectedTagIds,
    isInitialLoading,
    isRefreshing,
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
    setVisibility,
    setSelectedTagFilters,
  } = useBlockWorkspace();
  const { sessionsByBlockId } = useExternalEditSessions();
  const [pendingExternalEditIds, setPendingExternalEditIds] = useState<Set<string>>(
    () => new Set(),
  );
  const {
    editorRefs,
    createBlockWithFocus,
    deleteBlockWithFocus,
    setActiveBlockId,
    requestBlockFocus,
  } = useBlockShortcuts({
    blocks,
    createBlock,
    deleteBlock,
  });

  const { acknowledgePendingBlockId, pendingBlockId } = useOpenBlockRequest();

  const setExternalEditPending = (editId: string, pending: boolean) => {
    setPendingExternalEditIds((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(editId);
      } else {
        next.delete(editId);
      }
      return next;
    });
  };

  const handleSubmitExternalEdit = async (blockId: string, editId: string) => {
    setExternalEditPending(editId, true);
    try {
      const editorContent = await editorRefs.current.get(blockId)?.flushPendingMarkdown();
      const content = editorContent ?? blocks.find((block) => block.id === blockId)?.content;
      if (content === undefined) {
        toast.error("Cannot submit: block content unavailable.");
        return;
      }
      await submitExternalEdit({ content, editId });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setExternalEditPending(editId, false);
    }
  };

  const handleCancelExternalEdit = async (editId: string) => {
    setExternalEditPending(editId, true);
    try {
      await cancelExternalEdit({ editId });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setExternalEditPending(editId, false);
    }
  };

  useEffect(() => {
    if (!pendingBlockId) {
      return;
    }

    setVisibility("active");
    setSelectedTagFilters([]);
    void queryClient.invalidateQueries({ queryKey: ["blocks"] });
  }, [pendingBlockId, setSelectedTagFilters, setVisibility]);

  useEffect(() => {
    if (
      !pendingBlockId ||
      isInitialLoading ||
      isRefreshing ||
      visibility !== "active" ||
      selectedTagIds.length > 0
    ) {
      return;
    }

    const blockExists = blocks.some((block) => block.id === pendingBlockId);

    if (blockExists) {
      requestBlockFocus(pendingBlockId);
      acknowledgePendingBlockId(pendingBlockId);
    } else {
      toast.error("Block not found", {
        description: "The requested block does not exist or has been archived.",
      });
      acknowledgePendingBlockId(pendingBlockId);
    }
  }, [
    acknowledgePendingBlockId,
    pendingBlockId,
    blocks,
    isInitialLoading,
    isRefreshing,
    requestBlockFocus,
    selectedTagIds.length,
    visibility,
  ]);

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
            const externalEditSession = sessionsByBlockId.get(block.id);
            const isExternalEditPending = externalEditSession
              ? pendingExternalEditIds.has(externalEditSession.editId)
              : false;
            const isActionGroupDisabled = isBlockLocked(block.id) || isExternalEditPending;

            return (
              <NoteBlockEditor
                key={block.id}
                ref={(handle) => {
                  if (handle) {
                    editorRefs.current.set(block.id, handle);
                  } else {
                    editorRefs.current.delete(block.id);
                  }
                }}
                actions={
                  <BlockActions
                    block={block}
                    visibility={visibility}
                    tags={tags}
                    editorRef={editorRefs.current.get(block.id)}
                    isDisabled={isActionGroupDisabled}
                    isArchivePending={isBlockOpPending(
                      block.id,
                      visibility === "active" ? "archive" : "restore",
                    )}
                    isDeletePending={isBlockOpPending(block.id, "delete")}
                    isTagOpPending={isTagOpPending("create")}
                    onArchive={() => {
                      void archiveBlock(block.id);
                    }}
                    onRestore={() => {
                      void restoreBlock(block.id);
                    }}
                    onDelete={() => {
                      if (externalEditSession) {
                        void handleCancelExternalEdit(externalEditSession.editId);
                        return;
                      }

                      void deleteBlockWithFocus(block.id);
                    }}
                    onCreateTag={async (name) => {
                      await createTagAndAssignToBlock(block.id, name);
                    }}
                    onAssignTags={async (tagIds) => {
                      await assignBlockTags(block.id, tagIds);
                    }}
                  />
                }
                isExternalEditPending={Boolean(externalEditSession)}
                leadingActions={
                  externalEditSession ? (
                    <BlockExternalEditActions
                      isPending={isExternalEditPending}
                      onCancel={() => {
                        void handleCancelExternalEdit(externalEditSession.editId);
                      }}
                      onSubmit={() => {
                        void handleSubmitExternalEdit(block.id, externalEditSession.editId);
                      }}
                    />
                  ) : null
                }
                block={block}
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
