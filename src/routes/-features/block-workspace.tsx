import { Trans } from "@lingui/react/macro";
import { LoaderCircleIcon, PlusIcon, TagsIcon, XIcon } from "lucide-react";
import { useId, useState, type FormEvent, type ReactElement } from "react";

import { NoteBlockEditor } from "@/features/note-block/note-block-editor";
import { useBlockShortcuts } from "@/routes/-features/use-block-shortcuts";
import { useBlockWorkspace } from "@/routes/-features/use-block-workspace";
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

interface TagFilterBarProps {
  tags: Array<{ id: string; name: string }>;
  selectedTagIds: string[];
  deletingTagId: string | null;
  onToggleTagFilter: (tagId: string) => void;
  onDeleteTag: (tagId: string) => Promise<void>;
}

function TagFilterBar({
  tags,
  selectedTagIds,
  deletingTagId,
  onToggleTagFilter,
  onDeleteTag,
}: TagFilterBarProps) {
  if (tags.length === 0) {
    return (
      <div className="border-border/70 bg-card rounded-xl border border-dashed p-4">
        <p className="text-muted-foreground text-sm">
          <Trans id="workspace.tags.empty">Create tags to organize your blocks.</Trans>
        </p>
      </div>
    );
  }

  return (
    <div className="border-border/70 bg-card rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <TagsIcon className="text-muted-foreground size-4" />
        <p className="text-sm font-medium">
          <Trans id="workspace.tags.filter-title">Filter by tag</Trans>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          const isDeleting = deletingTagId === tag.id;

          return (
            <div
              key={tag.id}
              className="border-border inline-flex items-center overflow-hidden rounded-full border"
            >
              <button
                className={[
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  isSelected ? "bg-foreground text-background" : "bg-card hover:bg-muted",
                ].join(" ")}
                type="button"
                onClick={() => {
                  onToggleTagFilter(tag.id);
                }}
              >
                {tag.name}
              </button>
              <button
                className="border-border bg-card hover:bg-muted text-muted-foreground inline-flex h-full items-center border-s px-2 transition-colors"
                disabled={isDeleting}
                type="button"
                onClick={() => {
                  void onDeleteTag(tag.id);
                }}
              >
                {isDeleting ? (
                  <LoaderCircleIcon className="size-3 animate-spin" />
                ) : (
                  <XIcon className="size-3" />
                )}
                <span className="sr-only">
                  <Trans id="workspace.tags.delete">Delete tag</Trans>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TagComposerProps {
  isCreatingTag: boolean;
  onCreateTag: (name: string) => Promise<void>;
}

function TagComposer({ isCreatingTag, onCreateTag }: TagComposerProps) {
  const [tagName, setTagName] = useState("");
  const inputId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextTagName = tagName.trim();
    if (!nextTagName) {
      return;
    }

    await onCreateTag(nextTagName);
    setTagName("");
  };

  return (
    <form
      className="border-border/70 bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label className="flex flex-1 flex-col gap-2" htmlFor={inputId}>
        <span className="text-sm font-medium">
          <Trans id="workspace.tags.create-title">Create tag</Trans>
        </span>
        <input
          id={inputId}
          className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-ring/30 h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          value={tagName}
          onChange={(event) => {
            setTagName(event.target.value);
          }}
        />
      </label>

      <Button
        className="gap-2"
        disabled={isCreatingTag || tagName.trim().length === 0}
        type="submit"
      >
        {isCreatingTag ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <PlusIcon className="size-4" />
        )}
        <Trans id="workspace.tags.create-action">Add tag</Trans>
      </Button>
    </form>
  );
}

interface BlockTagPickerProps {
  tags: Array<{ id: string; name: string }>;
  blockId: string;
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => Promise<void>;
}

function BlockTagPicker({ tags, blockId, selectedTagIds, onToggleTag }: BlockTagPickerProps) {
  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        <Trans id="workspace.blocks.tags.empty">
          No tags yet. Create one above to classify this block.
        </Trans>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" data-block-tag-picker={blockId}>
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);

        return (
          <button
            key={tag.id}
            className={[
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:bg-muted",
            ].join(" ")}
            type="button"
            onClick={() => {
              void onToggleTag(tag.id);
            }}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
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
        <Trans id="workspace.empty.description">
          Start with an empty block and organize it later using tags.
        </Trans>
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
    isLoading,
    isCreatingBlock,
    isCreatingTag,
    deletingBlockId,
    deletingTagId,
    toggleTagFilter,
    createBlock,
    deleteBlock,
    createTag,
    deleteTag,
    setBlockTags,
  } = useBlockWorkspace();
  const { createBlockWithFocus, deleteBlockWithFocus, focusRequest, setActiveBlockId } =
    useBlockShortcuts({
      blocks,
      createBlock,
      deleteBlock,
    });

  if (isLoading) {
    return <LoadingState />;
  }

  if (blocks.length === 0 && selectedTagIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <TagComposer isCreatingTag={isCreatingTag} onCreateTag={createTag} />
        {tags.length > 0 ? (
          <TagFilterBar
            tags={tags}
            deletingTagId={deletingTagId}
            selectedTagIds={selectedTagIds}
            onDeleteTag={deleteTag}
            onToggleTagFilter={toggleTagFilter}
          />
        ) : null}
        <EmptyWorkspace isCreatingBlock={isCreatingBlock} onCreateBlock={createBlockWithFocus} />
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <TagComposer isCreatingTag={isCreatingTag} onCreateTag={createTag} />
      <TagFilterBar
        tags={tags}
        deletingTagId={deletingTagId}
        selectedTagIds={selectedTagIds}
        onDeleteTag={deleteTag}
        onToggleTagFilter={toggleTagFilter}
      />

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
              footer={
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
                    <Trans id="workspace.blocks.tags.label">Tags</Trans>
                  </p>
                  <BlockTagPicker
                    blockId={block.id}
                    tags={tags}
                    selectedTagIds={block.tags.map((tag) => tag.id)}
                    onToggleTag={async (tagId) => {
                      const nextTagIds = block.tags.some((tag) => tag.id === tagId)
                        ? block.tags.filter((tag) => tag.id !== tagId).map((tag) => tag.id)
                        : [...block.tags.map((tag) => tag.id), tagId];
                      await setBlockTags(block.id, nextTagIds);
                    }}
                  />
                </div>
              }
              isDeleting={deletingBlockId === block.id}
              isOnlyBlock={false}
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

      {tags.length === 0 ? null : (
        <p className="text-muted-foreground text-center text-xs">
          <Trans id="workspace.tags.hint">
            Tags only classify blocks and control filtering. They do not change editor behavior.
          </Trans>
        </p>
      )}
    </section>
  );
}
