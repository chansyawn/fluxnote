import type { Block, LocateBlockResult } from "@renderer/clients";
import { useEffectEvent } from "react";

import { isBlockNavigationCancelledError } from "./use-block-navigation";

export interface UseBlockFocusActionsParams {
  activeBlockId: string | null;
  archiveBlock: (blockId: string) => Promise<Block>;
  restoreBlock: (blockId: string) => Promise<Block>;
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  ensureBlockIndexLoaded: (
    index: number,
    options?: { refresh?: boolean },
  ) => Promise<Block | undefined>;
  navigateToBlock: (blockId: string) => Promise<void>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  setBlockKeepState: (blockId: string, isKept: boolean) => Promise<Block>;
  setActiveBlockId: (blockId: string | null) => void;
}

export interface UseBlockFocusActionsResult {
  archiveBlockWithFocus: (blockId: string) => Promise<void>;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  restoreBlockWithFocus: (blockId: string) => Promise<void>;
  toggleArchiveBlockWithFocus: (blockId: string) => Promise<void>;
  toggleKeepBlockWithFocus: (blockId: string) => Promise<void>;
}

export function getNextFocusIndexAfterMutation(
  currentIndex: number,
  totalCountBeforeMutation: number,
): number | null {
  if (totalCountBeforeMutation <= 1) {
    return null;
  }
  return currentIndex >= totalCountBeforeMutation - 1 ? currentIndex - 1 : currentIndex;
}

async function navigateToBlockUnlessCancelled(
  blockId: string,
  navigateToBlock: (blockId: string) => Promise<void>,
): Promise<void> {
  try {
    await navigateToBlock(blockId);
  } catch (error) {
    if (!isBlockNavigationCancelledError(error)) {
      throw error;
    }
  }
}

export function useBlockFocusActions({
  activeBlockId,
  archiveBlock,
  restoreBlock,
  totalBlockCount,
  createBlock,
  deleteBlock,
  ensureBlockIndexLoaded,
  navigateToBlock,
  locateBlockInView,
  setBlockKeepState,
  setActiveBlockId,
}: UseBlockFocusActionsParams): UseBlockFocusActionsResult {
  const focusNextBlockAfterMutation = useEffectEvent(
    async (currentIndex: number, countBeforeMutation: number) => {
      const nextIndex = getNextFocusIndexAfterMutation(currentIndex, countBeforeMutation);
      if (nextIndex === null) {
        setActiveBlockId(null);
        return;
      }

      const nextBlock = await ensureBlockIndexLoaded(nextIndex, { refresh: true });
      if (!nextBlock) {
        setActiveBlockId(null);
        return;
      }

      await navigateToBlockUnlessCancelled(nextBlock.id, navigateToBlock);
    },
  );

  const createBlockWithFocus = useEffectEvent(async () => {
    const newBlock = await createBlock();
    await navigateToBlockUnlessCancelled(newBlock.id, navigateToBlock);
  });

  const archiveBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeArchive = totalBlockCount;

    await archiveBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation) {
      setActiveBlockId(null);
      return;
    }

    await focusNextBlockAfterMutation(currentLocation.index, countBeforeArchive);
  });

  const restoreBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeRestore = totalBlockCount;

    await restoreBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation) {
      setActiveBlockId(null);
      return;
    }

    await focusNextBlockAfterMutation(currentLocation.index, countBeforeRestore);
  });

  const toggleArchiveBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const locatedBlock = await locateBlockInView(blockId);

    if (!locatedBlock) {
      return;
    }

    if (locatedBlock.block.archivedAt === null) {
      await archiveBlockWithFocus(blockId);
      return;
    }

    await restoreBlockWithFocus(blockId);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeDelete = totalBlockCount;

    await deleteBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation) {
      setActiveBlockId(null);
      return;
    }

    await focusNextBlockAfterMutation(currentLocation.index, countBeforeDelete);
  });

  const toggleKeepBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const locatedBlock = await locateBlockInView(blockId);

    if (!locatedBlock || locatedBlock.block.archivedAt !== null) {
      return;
    }

    await setBlockKeepState(blockId, !locatedBlock.block.isKept);
  });

  return {
    archiveBlockWithFocus,
    createBlockWithFocus,
    deleteBlockWithFocus,
    restoreBlockWithFocus,
    toggleArchiveBlockWithFocus,
    toggleKeepBlockWithFocus,
  };
}
