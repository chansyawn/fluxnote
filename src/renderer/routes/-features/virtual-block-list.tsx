import { useScrollContainer } from "@renderer/app/scroll-container";
import type { Block } from "@renderer/clients";
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
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useBlockListItemActions } from "./block-list-context";
import { useEditorRegistryContext } from "./editor-registry-context";

const BLOCK_ESTIMATED_SIZE_PX = 140;
const BLOCK_GAP_PX = 12;
const BLOCK_OVERSCAN = 3;

export interface VirtualBlockListHandle {
  scrollToIndex: (index: number) => void;
}

interface VirtualBlockListProps {
  totalCount: number;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndex: (index: number) => void;
}

const VirtualBlockItem = memo(function VirtualBlockItem({ block }: { block: Block }) {
  const actions = useBlockListItemActions();
  const registry = useEditorRegistryContext();

  const setEditorRef = useCallback(
    (handle: NoteBlockEditorHandle | null) => {
      registry.registerEditor(block.id, handle);
    },
    [block.id, registry.registerEditor],
  );

  const handleCopy = useCallback(() => {
    void registry.getEditor(block.id)?.copyContent();
  }, [block.id, registry.getEditor]);

  const externalEditSession = actions.sessionsByBlockId.get(block.id);
  const isExternalEditPending = externalEditSession
    ? actions.pendingExternalEditIds.has(externalEditSession.editId)
    : false;
  const isLocked = actions.isBlockLocked(block.id);

  const handleCreateTag = useCallback(
    async (name: string) => {
      const tag = await actions.onCreateTag(name);
      const currentTagIds = block.tags.map((t) => t.id);
      await actions.onAssignTags(block.id, [...new Set([...currentTagIds, tag.id])]);
    },
    [actions.onCreateTag, actions.onAssignTags, block.id, block.tags],
  );

  const handleAssignTags = useCallback(
    async (tagIds: string[]) => {
      await actions.onAssignTags(block.id, tagIds);
    },
    [actions.onAssignTags, block.id],
  );

  return (
    <NoteBlockEditor
      ref={setEditorRef}
      actions={
        <BlockActions
          block={block}
          visibility={actions.visibility}
          tags={actions.tags}
          isDisabled={isLocked || isExternalEditPending}
          isArchivePending={actions.isBlockOpPending(
            block.id,
            actions.visibility === "active" ? "archive" : "restore",
          )}
          isDeletePending={actions.isBlockOpPending(block.id, "delete")}
          isTagOpPending={actions.isTagCreatePending}
          onArchive={() => {
            actions.onArchive(block.id);
          }}
          onRestore={() => {
            actions.onRestore(block.id);
          }}
          onDelete={() => {
            if (externalEditSession) {
              actions.onCancelExternalEdit(externalEditSession.editId);
              return;
            }

            actions.onDelete(block.id);
          }}
          onCopy={handleCopy}
          onCreateTag={handleCreateTag}
          onAssignTags={handleAssignTags}
        />
      }
      isExternalEditPending={Boolean(externalEditSession)}
      leadingActions={
        externalEditSession ? (
          <BlockExternalEditActions
            isPending={isExternalEditPending}
            onCancel={() => {
              actions.onCancelExternalEdit(externalEditSession.editId);
            }}
            onSubmit={() => {
              actions.onSubmitExternalEdit(block.id, externalEditSession.editId);
            }}
          />
        ) : null
      }
      block={block}
      onFocus={actions.onFocus}
    />
  );
});

export const VirtualBlockList = forwardRef<VirtualBlockListHandle, VirtualBlockListProps>(
  function VirtualBlockList({ totalCount, getBlockAtIndex, ensureBlockIndex }, ref) {
    const scrollElement = useScrollContainer();
    const listElementRef = useRef<HTMLDivElement | null>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    const blockVirtualizer = useVirtualizer({
      count: totalCount,
      estimateSize: () => BLOCK_ESTIMATED_SIZE_PX,
      gap: BLOCK_GAP_PX,
      getItemKey: (index) => index,
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
        scrollToIndex: (index: number) => {
          if (index < 0 || index >= totalCount) {
            return;
          }

          blockVirtualizer.scrollToIndex(index, { align: "center" });
        },
      }),
      [blockVirtualizer, totalCount],
    );

    const virtualBlocks = blockVirtualizer.getVirtualItems();
    const prevVisibleRangeRef = useRef<{ start: number; end: number } | null>(null);

    useEffect(() => {
      if (virtualBlocks.length === 0) return;

      const start = virtualBlocks[0].index;
      const end = virtualBlocks[virtualBlocks.length - 1].index;
      const prev = prevVisibleRangeRef.current;
      if (prev && prev.start === start && prev.end === end) return;

      prevVisibleRangeRef.current = { start, end };
      for (const virtualBlock of virtualBlocks) {
        ensureBlockIndex(virtualBlock.index);
      }
    });

    return (
      <div ref={setListElement} className="pt-2">
        <div
          className="relative w-full"
          style={{
            height: `${blockVirtualizer.getTotalSize()}px`,
          }}
        >
          {virtualBlocks.map((virtualBlock) => {
            const block = getBlockAtIndex(virtualBlock.index);

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
                {block ? (
                  <VirtualBlockItem block={block} />
                ) : (
                  <div className="bg-card/40 border-border/50 min-h-28 rounded-xl border border-dashed" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
