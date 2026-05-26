import type { Block, LocateBlockResult } from "@renderer/clients";
import { captureRendererEvent } from "@renderer/features/telemetry";
import type { BlockCreatedSource } from "@shared/features/telemetry/contract";
import { useEffectEvent } from "react";

import type { BlockReorderOperation } from "../use-block-mutations";
import type { BlockNavigationAlign } from "./use-block-navigation";
import { isBlockNavigationCancelledError } from "./use-block-navigation";

export interface UseBlockFocusActionsParams {
  activeBlockId: string | null;
  archiveBlock: (blockId: string) => Promise<Block>;
  restoreBlock: (blockId: string) => Promise<Block>;
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  reorderBlock: (blockId: string, operation: BlockReorderOperation) => Promise<Block>;
  setBlockPinnedState: (blockId: string, isPinned: boolean) => Promise<Block>;
  ensureBlockIndexLoaded: (
    index: number,
    options?: { refresh?: boolean },
  ) => Promise<Block | undefined>;
  navigateToBlock: (blockId: string, options?: { align?: BlockNavigationAlign }) => Promise<void>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  setActiveBlockId: (blockId: string | null) => void;
}

export interface UseBlockFocusActionsResult {
  archiveBlockWithFocus: (blockId: string) => Promise<void>;
  createBlockWithFocus: (source: BlockCreatedSource) => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  reorderBlockWithFocus: (blockId: string, operation: BlockReorderOperation) => Promise<Block>;
  restoreBlockWithFocus: (blockId: string) => Promise<void>;
  setBlockPinnedStateWithFocus: (blockId: string, isPinned: boolean) => Promise<Block>;
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
  navigateToBlock: (blockId: string, options?: { align?: BlockNavigationAlign }) => Promise<void>,
  options?: { align?: BlockNavigationAlign },
): Promise<void> {
  try {
    await navigateToBlock(blockId, options);
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
  reorderBlock,
  setBlockPinnedState,
  ensureBlockIndexLoaded,
  navigateToBlock,
  locateBlockInView,
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

      await navigateToBlockUnlessCancelled(nextBlock.id, navigateToBlock, { align: "auto" });
    },
  );

  const createBlockWithFocus = useEffectEvent(async (source: BlockCreatedSource) => {
    const newBlock = await createBlock();
    captureRendererEvent("block_created", { source });
    await navigateToBlockUnlessCancelled(newBlock.id, navigateToBlock);
  });

  const runViewRemovingMutationWithFocus = useEffectEvent(
    async (blockId: string, mutateBlock: (blockId: string) => Promise<unknown>) => {
      const shouldMoveFocus = activeBlockId === blockId;
      const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
      const countBeforeMutation = totalBlockCount;

      await mutateBlock(blockId);

      if (!shouldMoveFocus) {
        return;
      }

      if (!currentLocation) {
        setActiveBlockId(null);
        return;
      }

      await focusNextBlockAfterMutation(currentLocation.index, countBeforeMutation);
    },
  );

  const archiveBlockWithFocus = useEffectEvent(async (blockId: string) => {
    await runViewRemovingMutationWithFocus(blockId, archiveBlock);
  });

  const restoreBlockWithFocus = useEffectEvent(async (blockId: string) => {
    await runViewRemovingMutationWithFocus(blockId, restoreBlock);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    await runViewRemovingMutationWithFocus(blockId, deleteBlock);
  });

  const reorderBlockWithFocus = useEffectEvent(
    async (blockId: string, operation: BlockReorderOperation) => {
      const block = await reorderBlock(blockId, operation);
      await navigateToBlockUnlessCancelled(blockId, navigateToBlock, { align: "auto" });
      return block;
    },
  );

  const setBlockPinnedStateWithFocus = useEffectEvent(
    async (blockId: string, isPinned: boolean) => {
      const block = await setBlockPinnedState(blockId, isPinned);
      await navigateToBlockUnlessCancelled(blockId, navigateToBlock, { align: "auto" });
      return block;
    },
  );

  return {
    archiveBlockWithFocus,
    createBlockWithFocus,
    deleteBlockWithFocus,
    reorderBlockWithFocus,
    restoreBlockWithFocus,
    setBlockPinnedStateWithFocus,
  };
}
