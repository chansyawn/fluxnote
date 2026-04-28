import type { Block, LocateBlockResult } from "@renderer/clients";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useEffectEvent, useMemo } from "react";

import type { BlockNavigationAlign } from "./use-block-navigation";

interface UseBlockShortcutsParams {
  activeBlockId: string | null;
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  navigateToBlock: (blockId: string) => void;
  navigateToIndex: (index: number, options?: { align?: BlockNavigationAlign }) => void;
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

  const isActiveBlockFocused = useEffectEvent(() => {
    if (!activeBlockId) {
      return false;
    }

    const focusedBlockEditor = document.activeElement?.closest<HTMLElement>("[data-note-block-id]");

    return focusedBlockEditor?.dataset.noteBlockId === activeBlockId;
  });

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

  const hotkeyDefinitions = useMemo<UseHotkeyDefinition[]>(() => {
    const definitions: UseHotkeyDefinition[] = [];
    const createBlockShortcut = shortcuts["create-block"];
    const deleteBlockShortcut = shortcuts["delete-block"];

    if (createBlockShortcut) {
      definitions.push({
        hotkey: createBlockShortcut,
        callback: (event) => {
          if (event.repeat || !isActiveBlockFocused()) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          void createBlockWithFocus();
        },
        options: {
          meta: { name: "Create block" },
        },
      });
    }

    if (deleteBlockShortcut) {
      definitions.push({
        hotkey: deleteBlockShortcut,
        callback: (event) => {
          if (event.repeat || !activeBlockId || !isActiveBlockFocused()) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          void deleteBlockWithFocus(activeBlockId);
        },
        options: {
          meta: { name: "Delete block" },
        },
      });
    }

    return definitions;
  }, [activeBlockId, createBlockWithFocus, deleteBlockWithFocus, isActiveBlockFocused, shortcuts]);

  useHotkeys(hotkeyDefinitions, {
    ignoreInputs: false,
    preventDefault: false,
    stopPropagation: false,
  });

  return {
    createBlockWithFocus,
    deleteBlockWithFocus,
  };
}
