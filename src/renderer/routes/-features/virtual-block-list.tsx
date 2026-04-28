import type { Block } from "@renderer/clients";
import { BlockActions } from "@renderer/features/note-block/block-actions";
import { BlockExternalEditActions } from "@renderer/features/note-block/block-external-edit-actions";
import {
  NoteBlockEditor,
  type NoteBlockEditorHandle,
} from "@renderer/features/note-block/note-block-editor";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useBlockListItemActions } from "./block-list-context";
import { useEditorRegistryContext } from "./editor-registry-context";
import type { BlockScrollTarget, BlockScrollTargetRenderedPayload } from "./use-block-navigation";

const BLOCK_ESTIMATED_SIZE_PX = 140;
const BLOCK_GAP_PX = 12;
const BLOCK_OVERSCAN = 5;

function isScrollableOverflow(overflowValue: string): boolean {
  return overflowValue === "auto" || overflowValue === "scroll" || overflowValue === "overlay";
}

function findNearestScrollElement(element: HTMLElement): HTMLElement | null {
  let currentElement: HTMLElement | null = element.parentElement;
  while (currentElement) {
    const style = window.getComputedStyle(currentElement);
    if (isScrollableOverflow(style.overflowY) || isScrollableOverflow(style.overflow)) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  if (document.scrollingElement instanceof HTMLElement) {
    return document.scrollingElement;
  }

  return document.documentElement;
}

interface VirtualBlockListProps {
  totalCount: number;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndex: (index: number) => void;
  onScrollTargetRendered: (payload: BlockScrollTargetRenderedPayload) => void;
  scrollTarget: BlockScrollTarget | null;
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
    void registry.getEditor(block.id)?.copy();
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

export function VirtualBlockList({
  totalCount,
  getBlockAtIndex,
  ensureBlockIndex,
  onScrollTargetRendered,
  scrollTarget,
}: VirtualBlockListProps) {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const listElementRef = useRef<HTMLDivElement | null>(null);
  const navigationAnchorRef = useRef<HTMLSpanElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const getBlockItemKey = useCallback(
    (index: number) => getBlockAtIndex(index)?.id ?? `placeholder-${index}`,
    [getBlockAtIndex],
  );

  const blockVirtualizer = useVirtualizer({
    count: totalCount,
    estimateSize: () => BLOCK_ESTIMATED_SIZE_PX,
    gap: BLOCK_GAP_PX,
    getItemKey: getBlockItemKey,
    getScrollElement: () => scrollElement,
    overscan: BLOCK_OVERSCAN,
    scrollMargin,
    useFlushSync: false,
  });

  const setListElement = useCallback((element: HTMLDivElement | null) => {
    listElementRef.current = element;
    setScrollElement(element ? findNearestScrollElement(element) : null);
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

      const nextScrollMargin = Math.max(0, listRect.top - scrollRect.top + scrollElement.scrollTop);
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

  const virtualBlocks = blockVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!scrollTarget || !scrollElement) {
      return;
    }
    if (scrollTarget.index < 0 || scrollTarget.index >= totalCount) {
      return;
    }

    if (scrollTarget.align !== "start") {
      blockVirtualizer.scrollToIndex(scrollTarget.index, {
        align: scrollTarget.align,
        behavior: "smooth",
      });
      return;
    }

    const anchorElement = navigationAnchorRef.current;
    const targetElement = listElementRef.current?.querySelector<HTMLElement>(
      `[data-index="${scrollTarget.index}"]`,
    );

    if (!anchorElement || !targetElement) {
      blockVirtualizer.scrollToIndex(scrollTarget.index, {
        align: "start",
        behavior: "auto",
      });
      return;
    }

    const anchorTop = anchorElement.getBoundingClientRect().top;
    const targetTop = targetElement.getBoundingClientRect().top;
    const nextScrollTop = scrollElement.scrollTop + (targetTop - anchorTop);
    scrollElement.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: "smooth",
    });
  }, [blockVirtualizer, scrollElement, scrollTarget, totalCount, virtualBlocks]);

  const visibleRange = useMemo(() => {
    if (virtualBlocks.length === 0) {
      return null;
    }

    return {
      start: virtualBlocks[0].index,
      end: virtualBlocks[virtualBlocks.length - 1].index,
    };
  }, [virtualBlocks]);

  useEffect(() => {
    if (!visibleRange) {
      return;
    }

    for (let index = visibleRange.start; index <= visibleRange.end; index += 1) {
      ensureBlockIndex(index);
    }
  }, [ensureBlockIndex, visibleRange]);

  useEffect(() => {
    if (!scrollTarget) {
      return;
    }

    const renderedTarget = virtualBlocks.find(
      (virtualBlock) => virtualBlock.index === scrollTarget.index,
    );
    if (!renderedTarget) {
      return;
    }

    const block = getBlockAtIndex(scrollTarget.index);
    if (!block) {
      return;
    }

    onScrollTargetRendered({
      blockId: block.id,
      index: scrollTarget.index,
      requestId: scrollTarget.requestId,
    });
  }, [getBlockAtIndex, onScrollTargetRendered, scrollTarget, virtualBlocks]);

  const firstVirtualBlock = virtualBlocks[0];

  return (
    <div ref={setListElement} className="pt-2">
      <div
        className="relative w-full"
        style={{
          height: `${blockVirtualizer.getTotalSize()}px`,
        }}
      >
        <span
          ref={navigationAnchorRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 h-0 w-0"
        />
        <div
          className="absolute top-0 left-0 flex w-full flex-col gap-3"
          style={{
            transform: firstVirtualBlock
              ? `translateY(${firstVirtualBlock.start - blockVirtualizer.options.scrollMargin}px)`
              : undefined,
          }}
        >
          {virtualBlocks.map((virtualBlock) => {
            const block = getBlockAtIndex(virtualBlock.index);

            return (
              <div
                key={virtualBlock.key}
                ref={blockVirtualizer.measureElement}
                data-index={virtualBlock.index}
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
    </div>
  );
}
