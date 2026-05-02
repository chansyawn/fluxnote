import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useEffectEvent, useMemo } from "react";

export interface UseBlockShortcutsParams {
  activeBlockId: string | null;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
}

export function useBlockShortcuts({
  activeBlockId,
  createBlockWithFocus,
  deleteBlockWithFocus,
}: UseBlockShortcutsParams): void {
  const { shortcuts } = useShortcutState();

  const isActiveBlockFocused = useEffectEvent(() => {
    if (!activeBlockId) {
      return false;
    }

    const focusedBlockEditor = document.activeElement?.closest<HTMLElement>("[data-block-id]");

    return focusedBlockEditor?.dataset.blockId === activeBlockId;
  });

  const hotkeyDefinitions = useMemo<UseHotkeyDefinition[]>(() => {
    const definitions: UseHotkeyDefinition[] = [];
    const createBlockShortcut = shortcuts["create-block"];
    const deleteBlockShortcut = shortcuts["delete-block"];

    if (createBlockShortcut) {
      definitions.push({
        hotkey: createBlockShortcut,
        callback: (event) => {
          if (event.repeat) {
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
}
