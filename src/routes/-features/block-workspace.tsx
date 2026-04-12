import { Trans } from "@lingui/react/macro";
import { LoaderCircleIcon, PlusIcon, TagIcon } from "lucide-react";
import type { ReactElement } from "react";

import { NoteBlockEditor } from "@/features/note-block/note-block-editor";
import { TagComboboxPopover } from "@/routes/-features/tag-combobox-popover";
import { useBlockShortcuts } from "@/routes/-features/use-block-shortcuts";
import { useBlockWorkspace } from "@/routes/-features/use-block-workspace";
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

export function BlockWorkspace() {
  const {
    blocks,
    tags,
    selectedTagIds,
    isInitialLoading,
    isCreatingBlock,
    isCreatingTag,
    deletingBlockId,
    createBlock,
    deleteBlock,
    createTagAndAssignToBlock,
    assignBlockTags,
  } = useBlockWorkspace();
  const { createBlockWithFocus, deleteBlockWithFocus, focusRequest, setActiveBlockId } =
    useBlockShortcuts({
      blocks,
      createBlock,
      deleteBlock,
    });

  if (isInitialLoading) {
    return <LoadingState />;
  }

  if (blocks.length === 0 && selectedTagIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <WorkspaceTagFilterPortal />
        <EmptyWorkspace isCreatingBlock={isCreatingBlock} onCreateBlock={createBlockWithFocus} />
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <WorkspaceTagFilterPortal />
      {blocks.length === 0 ? (
        <div className="border-border/70 bg-card rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm font-medium">
            <Trans id="workspace.filtered.empty.title">No blocks match the selected tags</Trans>
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            <Trans id="workspace.filtered.empty.description">
              Clear one of the filters or create a new block outside the current tag selection.
            </Trans>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <NoteBlockEditor
              key={block.id}
              block={block}
              focusRequestKey={focusRequest?.blockId === block.id ? focusRequest.requestKey : 0}
              isDeleting={deletingBlockId === block.id}
              isOnlyBlock={false}
              tagAction={
                <TagComboboxPopover
                  placeholder="Search or assign tags"
                  isCreatingTag={isCreatingTag}
                  selectedTagIds={block.tags.map((tag) => tag.id)}
                  tags={tags}
                  trigger={
                    <>
                      <TagIcon className="size-3.5" />
                      <span className="sr-only">
                        <Trans id="workspace.tags.assign.button">Assign tags</Trans>
                      </span>
                    </>
                  }
                  onCreateTag={async (name) => {
                    await createTagAndAssignToBlock(block.id, name);
                  }}
                  onSelectedTagIdsChange={async (tagIds) => {
                    await assignBlockTags(block.id, tagIds);
                  }}
                />
              }
              onDelete={async (blockId: string) => {
                await deleteBlockWithFocus(blockId);
              }}
              onFocus={setActiveBlockId}
            />
          ))}
        </div>
      )}

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
    </section>
  );
}
