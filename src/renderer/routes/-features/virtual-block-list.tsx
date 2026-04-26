import { useScrollContainer } from "@renderer/app/scroll-container";
import type { Block, BlockVisibility, ExternalEditSession, Tag } from "@renderer/clients";
import { BlockActions } from "@renderer/features/note-block/block-actions";
import { BlockExternalEditActions } from "@renderer/features/note-block/block-external-edit-actions";
import {
  NoteBlockEditor,
  type NoteBlockEditorHandle,
} from "@renderer/features/note-block/note-block-editor";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { BlockMutationOperation, TagMutationOperation } from "./use-workspace-data";

const BLOCK_ESTIMATED_SIZE_PX = 140;
const BLOCK_GAP_PX = 12;
const BLOCK_OVERSCAN = 3;

export interface VirtualBlockListHandle {
  scrollToBlock: (blockId: string) => void;
}

interface VirtualBlockListProps {
  blocks: Block[];
  tags: Tag[];
  visibility: BlockVisibility;
  sessionsByBlockId: Map<string, ExternalEditSession>;
  pendingExternalEditIds: Set<string>;
  registerEditorRef: (blockId: string, handle: NoteBlockEditorHandle | null) => void;
  isBlockLocked: (blockId: string) => boolean;
  isBlockOpPending: (blockId: string, op: BlockMutationOperation) => boolean;
  isTagOpPending: (op: TagMutationOperation, tagId?: string) => boolean;
  onArchiveBlock: (blockId: string) => void;
  onRestoreBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onCreateTag: (blockId: string, name: string) => Promise<void>;
  onAssignTags: (blockId: string, tagIds: string[]) => Promise<void>;
  onCancelExternalEdit: (editId: string) => void;
  onSubmitExternalEdit: (blockId: string, editId: string) => void;
  onFocusBlock: (blockId: string) => void;
}

interface VirtualBlockItemProps {
  block: Block;
  tags: Tag[];
  visibility: BlockVisibility;
  externalEditSession: ExternalEditSession | undefined;
  isExternalEditPending: boolean;
  isLocked: boolean;
  isArchivePending: boolean;
  isDeletePending: boolean;
  isTagCreatePending: boolean;
  registerEditorRef: (blockId: string, handle: NoteBlockEditorHandle | null) => void;
  onArchiveBlock: (blockId: string) => void;
  onRestoreBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onCreateTag: (blockId: string, name: string) => Promise<void>;
  onAssignTags: (blockId: string, tagIds: string[]) => Promise<void>;
  onCancelExternalEdit: (editId: string) => void;
  onSubmitExternalEdit: (blockId: string, editId: string) => void;
  onFocusBlock: (blockId: string) => void;
}

const VirtualBlockItem = memo(function VirtualBlockItem({
  block,
  tags,
  visibility,
  externalEditSession,
  isExternalEditPending,
  isLocked,
  isArchivePending,
  isDeletePending,
  isTagCreatePending,
  registerEditorRef,
  onArchiveBlock,
  onRestoreBlock,
  onDeleteBlock,
  onCreateTag,
  onAssignTags,
  onCancelExternalEdit,
  onSubmitExternalEdit,
  onFocusBlock,
}: VirtualBlockItemProps) {
  const editorHandleRef = useRef<NoteBlockEditorHandle | null>(null);
  const editorHandleProxy = useMemo<NoteBlockEditorHandle>(
    () => ({
      copyContent: async () => {
        await editorHandleRef.current?.copyContent();
      },
      flushPendingMarkdown: async () =>
        (await editorHandleRef.current?.flushPendingMarkdown()) ?? "",
      focus: () => {
        editorHandleRef.current?.focus();
      },
    }),
    [],
  );

  const setEditorRef = useCallback(
    (handle: NoteBlockEditorHandle | null) => {
      editorHandleRef.current = handle;
      registerEditorRef(block.id, handle);
    },
    [block.id, registerEditorRef],
  );

  return (
    <NoteBlockEditor
      ref={setEditorRef}
      actions={
        <BlockActions
          block={block}
          visibility={visibility}
          tags={tags}
          editorRef={editorHandleProxy}
          isDisabled={isLocked || isExternalEditPending}
          isArchivePending={isArchivePending}
          isDeletePending={isDeletePending}
          isTagOpPending={isTagCreatePending}
          onArchive={() => {
            onArchiveBlock(block.id);
          }}
          onRestore={() => {
            onRestoreBlock(block.id);
          }}
          onDelete={() => {
            if (externalEditSession) {
              onCancelExternalEdit(externalEditSession.editId);
              return;
            }

            onDeleteBlock(block.id);
          }}
          onCreateTag={async (name) => {
            await onCreateTag(block.id, name);
          }}
          onAssignTags={async (tagIds) => {
            await onAssignTags(block.id, tagIds);
          }}
        />
      }
      isExternalEditPending={Boolean(externalEditSession)}
      leadingActions={
        externalEditSession ? (
          <BlockExternalEditActions
            isPending={isExternalEditPending}
            onCancel={() => {
              onCancelExternalEdit(externalEditSession.editId);
            }}
            onSubmit={() => {
              onSubmitExternalEdit(block.id, externalEditSession.editId);
            }}
          />
        ) : null
      }
      block={block}
      onFocus={onFocusBlock}
    />
  );
});

export const VirtualBlockList = forwardRef<VirtualBlockListHandle, VirtualBlockListProps>(
  function VirtualBlockList(
    {
      blocks,
      tags,
      visibility,
      sessionsByBlockId,
      pendingExternalEditIds,
      registerEditorRef,
      isBlockLocked,
      isBlockOpPending,
      isTagOpPending,
      onArchiveBlock,
      onRestoreBlock,
      onDeleteBlock,
      onCreateTag,
      onAssignTags,
      onCancelExternalEdit,
      onSubmitExternalEdit,
      onFocusBlock,
    },
    ref,
  ) {
    const scrollElement = useScrollContainer();
    const listElementRef = useRef<HTMLDivElement | null>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    const blockVirtualizer = useVirtualizer({
      count: blocks.length,
      estimateSize: () => BLOCK_ESTIMATED_SIZE_PX,
      gap: BLOCK_GAP_PX,
      getItemKey: (index) => blocks[index]?.id ?? index,
      getScrollElement: () => scrollElement,
      overscan: BLOCK_OVERSCAN,
      scrollMargin,
      useFlushSync: false,
    });

    const setListElement = useCallback((element: HTMLDivElement | null) => {
      listElementRef.current = element;
    }, []);

    useLayoutEffect(() => {
      if (!scrollElement || !listElementRef.current) {
        return;
      }

      let animationFrameId = 0;
      const updateScrollMargin = () => {
        const scrollRect = scrollElement.getBoundingClientRect();
        const listRect = listElementRef.current?.getBoundingClientRect();
        if (!listRect) {
          return;
        }

        const nextScrollMargin = Math.max(
          0,
          listRect.top - scrollRect.top + scrollElement.scrollTop,
        );
        setScrollMargin((currentScrollMargin) =>
          currentScrollMargin === nextScrollMargin ? currentScrollMargin : nextScrollMargin,
        );
      };
      const scheduleUpdate = () => {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(updateScrollMargin);
      };

      updateScrollMargin();

      const resizeObserver =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
      resizeObserver?.observe(scrollElement);
      resizeObserver?.observe(listElementRef.current);
      window.addEventListener("resize", scheduleUpdate);

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", scheduleUpdate);
      };
    }, [scrollElement]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToBlock: (blockId: string) => {
          const blockIndex = blocks.findIndex((block) => block.id === blockId);
          if (blockIndex === -1) {
            return;
          }

          blockVirtualizer.scrollToIndex(blockIndex, { align: "center" });
        },
      }),
      [blockVirtualizer, blocks],
    );

    const isTagCreatePending = isTagOpPending("create");
    const virtualBlocks = blockVirtualizer.getVirtualItems();

    return (
      <div ref={setListElement} className="pt-2">
        <div
          className="relative w-full"
          style={{
            height: `${blockVirtualizer.getTotalSize()}px`,
          }}
        >
          {virtualBlocks.map((virtualBlock) => {
            const block = blocks[virtualBlock.index];
            if (!block) {
              return null;
            }

            const externalEditSession = sessionsByBlockId.get(block.id);

            return (
              <div
                key={virtualBlock.key}
                ref={blockVirtualizer.measureElement}
                className="absolute inset-x-0 top-0 w-full"
                data-index={virtualBlock.index}
                style={{
                  transform: `translateY(${
                    virtualBlock.start - blockVirtualizer.options.scrollMargin
                  }px)`,
                }}
              >
                <VirtualBlockItem
                  block={block}
                  tags={tags}
                  visibility={visibility}
                  externalEditSession={externalEditSession}
                  isExternalEditPending={
                    externalEditSession
                      ? pendingExternalEditIds.has(externalEditSession.editId)
                      : false
                  }
                  isLocked={isBlockLocked(block.id)}
                  isArchivePending={isBlockOpPending(
                    block.id,
                    visibility === "active" ? "archive" : "restore",
                  )}
                  isDeletePending={isBlockOpPending(block.id, "delete")}
                  isTagCreatePending={isTagCreatePending}
                  registerEditorRef={registerEditorRef}
                  onArchiveBlock={onArchiveBlock}
                  onRestoreBlock={onRestoreBlock}
                  onDeleteBlock={onDeleteBlock}
                  onCreateTag={onCreateTag}
                  onAssignTags={onAssignTags}
                  onCancelExternalEdit={onCancelExternalEdit}
                  onSubmitExternalEdit={onSubmitExternalEdit}
                  onFocusBlock={onFocusBlock}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
