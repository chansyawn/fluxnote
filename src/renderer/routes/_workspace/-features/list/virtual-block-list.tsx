import type { Block } from "@renderer/clients";
import { useFontSizePreference } from "@renderer/features/preferences/preferences-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { BlockActionPosition } from "../adornments/block-actions";
import type { BlockScrollTarget } from "../navigation/use-block-navigation";
import { BlockListRow } from "./block-list-row";

const BLOCK_ESTIMATED_SIZE_AT_BASE_PX = 140;
const BLOCK_GAP_AT_BASE_PX = 12;
const BLOCK_OVERSCAN = 5;

function getBlockListSizing(fontSize: number) {
  const scale = fontSize / 16;
  return {
    blockEstimatedSizePx: BLOCK_ESTIMATED_SIZE_AT_BASE_PX * scale,
    blockGapPx: BLOCK_GAP_AT_BASE_PX * scale,
  };
}

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

function getBlockActionPosition({
  block,
  getBlockAtIndex,
  index,
  totalCount,
}: {
  block: Block | undefined;
  getBlockAtIndex: (index: number) => Block | undefined;
  index: number;
  totalCount: number;
}): BlockActionPosition {
  if (!block) {
    return { canMoveDown: false, canMoveToTop: false, canMoveUp: false };
  }

  const previousBlock = index > 0 ? getBlockAtIndex(index - 1) : undefined;
  const nextBlock = index < totalCount - 1 ? getBlockAtIndex(index + 1) : undefined;
  const canMoveUp = index > 0 && (previousBlock ? previousBlock.isPinned === block.isPinned : true);
  const canMoveDown =
    index < totalCount - 1 && (nextBlock ? nextBlock.isPinned === block.isPinned : true);

  return {
    canMoveDown,
    canMoveToTop: canMoveUp,
    canMoveUp,
  };
}

function shouldShowPinnedSectionDivider(
  block: Block | undefined,
  previousBlock: Block | undefined,
) {
  return Boolean(block && previousBlock?.isPinned && !block.isPinned);
}

function PinnedSectionDivider() {
  return (
    <div aria-hidden="true" data-pinned-section-divider="" className="mb-3 px-1">
      <div className="bg-border h-0.25 w-full" />
    </div>
  );
}

interface VirtualBlockListProps {
  totalCount: number;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockRange: (startIndex: number, endIndex: number) => void;
  onScrollTargetRendered: (blockId: string) => void;
  scrollTarget: BlockScrollTarget | null;
}

export function VirtualBlockList({
  totalCount,
  getBlockAtIndex,
  ensureBlockRange,
  onScrollTargetRendered,
  scrollTarget,
}: VirtualBlockListProps) {
  const { fontSize } = useFontSizePreference();
  const { blockEstimatedSizePx, blockGapPx } = getBlockListSizing(fontSize);

  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const listElementRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const getBlockItemKey = useCallback(
    (index: number) => getBlockAtIndex(index)?.id ?? `placeholder-${index}`,
    [getBlockAtIndex],
  );

  const blockVirtualizer = useVirtualizer({
    count: totalCount,
    estimateSize: () => blockEstimatedSizePx,
    gap: blockGapPx,
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

    ensureBlockRange(Math.max(0, visibleRange.start - 1), visibleRange.end);
  }, [ensureBlockRange, visibleRange]);

  const scrollRequestId = scrollTarget?.requestId;
  const scrollIndex = scrollTarget?.index;
  const scrollAlign = scrollTarget?.align;

  useEffect(() => {
    if (!scrollTarget || !scrollElement) {
      return;
    }
    if (scrollTarget.index < 0 || scrollTarget.index >= totalCount) {
      return;
    }

    blockVirtualizer.scrollToIndex(scrollTarget.index, {
      align: scrollTarget.align,
      behavior: "smooth",
    });
  }, [blockVirtualizer, scrollAlign, scrollElement, scrollIndex, scrollRequestId, totalCount]);

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

    onScrollTargetRendered(block.id);
  }, [getBlockAtIndex, onScrollTargetRendered, scrollTarget, virtualBlocks]);

  const firstVirtualBlock = virtualBlocks[0];

  return (
    <div ref={setListElement} className="py-3">
      <div
        className="relative w-full"
        style={{
          height: `${blockVirtualizer.getTotalSize()}px`,
        }}
      >
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
            const previousBlock =
              virtualBlock.index > 0 ? getBlockAtIndex(virtualBlock.index - 1) : undefined;
            return (
              <div
                key={virtualBlock.key}
                ref={blockVirtualizer.measureElement}
                data-index={virtualBlock.index}
              >
                {shouldShowPinnedSectionDivider(block, previousBlock) ? (
                  <PinnedSectionDivider />
                ) : null}
                <BlockListRow
                  block={block}
                  position={getBlockActionPosition({
                    block,
                    getBlockAtIndex,
                    index: virtualBlock.index,
                    totalCount,
                  })}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
