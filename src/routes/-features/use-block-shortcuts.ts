import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { Block } from "@/clients";
import { useShortcutState } from "@/features/shortcut/shortcut-state";
import { matchShortcutEvent } from "@/features/shortcut/shortcut-utils";

interface FocusRequest {
  blockId: string;
  requestKey: number;
}

interface UseBlockShortcutsParams {
  blocks: Block[];
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
}

interface UseBlockShortcutsResult {
  focusRequest: FocusRequest | null;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  setActiveBlockId: (blockId: string) => void;
  requestBlockFocus: (blockId: string) => void;
}

function getAdjacentBlockId(blocks: Block[], blockId: string): string | null {
  const currentIndex = blocks.findIndex((block) => block.id === blockId);

  if (currentIndex === -1) {
    return null;
  }

  return blocks[currentIndex - 1]?.id ?? blocks[currentIndex + 1]?.id ?? null;
}

export function useBlockShortcuts({
  blocks,
  createBlock,
  deleteBlock,
}: UseBlockShortcutsParams): UseBlockShortcutsResult {
  const { shortcuts } = useShortcutState();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusRequestCounterRef = useRef(0);

  const requestBlockFocus = useEffectEvent((blockId: string | null) => {
    if (!blockId) {
      return;
    }

    focusRequestCounterRef.current += 1;
    setFocusRequest({
      blockId,
      requestKey: focusRequestCounterRef.current,
    });
    setActiveBlockId(blockId);
  });

  const createBlockWithFocus = useEffectEvent(async () => {
    const newBlock = await createBlock();
    requestBlockFocus(newBlock.id);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const nextFocusBlockId = shouldMoveFocus ? getAdjacentBlockId(blocks, blockId) : null;

    await deleteBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!nextFocusBlockId) {
      setActiveBlockId(null);
      return;
    }

    requestBlockFocus(nextFocusBlockId);
  });

  useEffect(() => {
    if (!activeBlockId) {
      return;
    }

    const hasActiveBlock = blocks.some((block) => block.id === activeBlockId);

    if (!hasActiveBlock) {
      setActiveBlockId(null);
    }
  }, [activeBlockId, blocks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !activeBlockId) {
        return;
      }

      const focusedBlockEditor =
        document.activeElement?.closest<HTMLElement>("[data-note-block-id]");

      if (!focusedBlockEditor || focusedBlockEditor.dataset.noteBlockId !== activeBlockId) {
        return;
      }

      if (matchShortcutEvent(event, shortcuts["create-block"])) {
        event.preventDefault();
        event.stopPropagation();
        void createBlockWithFocus();
        return;
      }

      if (!matchShortcutEvent(event, shortcuts["delete-block"])) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void deleteBlockWithFocus(activeBlockId);
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activeBlockId, createBlockWithFocus, deleteBlockWithFocus, shortcuts]);

  return {
    focusRequest,
    createBlockWithFocus,
    deleteBlockWithFocus,
    setActiveBlockId,
    requestBlockFocus,
  };
}
