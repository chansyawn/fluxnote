import type { Block, LocateBlockResult } from "@renderer/clients";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { matchShortcutEvent } from "@renderer/features/shortcut/shortcut-utils";
import { useEffect, useEffectEvent } from "react";

interface UseBlockShortcutsParams {
  activeBlockId: string | null;
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  navigateToBlock: (blockId: string) => void;
  navigateToIndex: (index: number) => void;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  setActiveBlockId: (blockId: string | null) => void;
}

interface UseBlockShortcutsResult {
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
}

export function useBlockShortcuts({
  activeBlockId,
  totalBlockCount,
  createBlock,
  deleteBlock,
  navigateToBlock,
  navigateToIndex,
  locateBlockInView,
  setActiveBlockId,
}: UseBlockShortcutsParams): UseBlockShortcutsResult {
  const { shortcuts } = useShortcutState();

  const createBlockWithFocus = useEffectEvent(async () => {
    const newBlock = await createBlock();
    navigateToBlock(newBlock.id);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeDelete = totalBlockCount;

    await deleteBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation || countBeforeDelete <= 1) {
      setActiveBlockId(null);
      return;
    }

    const nextIndex =
      currentLocation.index >= countBeforeDelete - 1
        ? currentLocation.index - 1
        : currentLocation.index;
    navigateToIndex(nextIndex);
  });

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
    createBlockWithFocus,
    deleteBlockWithFocus,
  };
}
