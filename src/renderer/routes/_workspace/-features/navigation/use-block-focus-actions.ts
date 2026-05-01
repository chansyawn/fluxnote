import type { Block, LocateBlockResult } from "@renderer/features/ipc";
import { useEffectEvent } from "react";

import type { BlockNavigationAlign } from "./use-block-navigation";

export interface UseBlockFocusActionsParams {
  activeBlockId: string | null;
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  navigateToBlock: (blockId: string) => void;
  navigateToIndex: (index: number, options?: { align?: BlockNavigationAlign }) => void;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  setActiveBlockId: (blockId: string | null) => void;
}

export interface UseBlockFocusActionsResult {
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
}

export function useBlockFocusActions({
  activeBlockId,
  totalBlockCount,
  createBlock,
  deleteBlock,
  navigateToBlock,
  navigateToIndex,
  locateBlockInView,
  setActiveBlockId,
}: UseBlockFocusActionsParams): UseBlockFocusActionsResult {
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
    navigateToIndex(nextIndex, { align: "auto" });
  });

  return {
    createBlockWithFocus,
    deleteBlockWithFocus,
  };
}
