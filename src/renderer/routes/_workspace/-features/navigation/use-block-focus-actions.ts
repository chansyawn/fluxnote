import type { Block, LocateBlockResult } from "@renderer/clients";
import { useEffectEvent } from "react";

import type { BlockNavigationAlign } from "./use-block-navigation";

export interface UseBlockFocusActionsParams {
  activeBlockId: string | null;
  archiveBlock: (blockId: string) => Promise<Block>;
  restoreBlock: (blockId: string) => Promise<Block>;
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  navigateToBlock: (blockId: string) => void;
  navigateToIndex: (index: number, options?: { align?: BlockNavigationAlign }) => void;
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

export function useBlockFocusActions({
  activeBlockId,
  archiveBlock,
  restoreBlock,
  totalBlockCount,
  createBlock,
  deleteBlock,
  navigateToBlock,
  navigateToIndex,
  locateBlockInView,
  setBlockKeepState,
  setActiveBlockId,
}: UseBlockFocusActionsParams): UseBlockFocusActionsResult {
  const createBlockWithFocus = useEffectEvent(async () => {
    const newBlock = await createBlock();
    navigateToBlock(newBlock.id);
  });

  const archiveBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeArchive = totalBlockCount;

    await archiveBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation || countBeforeArchive <= 1) {
      setActiveBlockId(null);
      return;
    }

    const nextIndex =
      currentLocation.index >= countBeforeArchive - 1
        ? currentLocation.index - 1
        : currentLocation.index;
    navigateToIndex(nextIndex, { align: "auto" });
  });

  const restoreBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeRestore = totalBlockCount;

    await restoreBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation || countBeforeRestore <= 1) {
      setActiveBlockId(null);
      return;
    }

    const nextIndex =
      currentLocation.index >= countBeforeRestore - 1
        ? currentLocation.index - 1
        : currentLocation.index;
    navigateToIndex(nextIndex, { align: "auto" });
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
