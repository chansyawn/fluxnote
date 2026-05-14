import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useEffectEvent, useMemo } from "react";

export interface UseBlockShortcutsParams {
  activeBlockId: string | null;
  archiveBlockWithFocus: (blockId: string) => Promise<void>;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  toggleKeepBlockWithFocus: (blockId: string) => Promise<void>;
}

export function useBlockShortcuts({
  activeBlockId,
  archiveBlockWithFocus,
  createBlockWithFocus,
  deleteBlockWithFocus,
  toggleKeepBlockWithFocus,
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
    const keepBlockShortcut = shortcuts["keep-block"];
    const archiveBlockShortcut = shortcuts["archive-block"];
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

    if (keepBlockShortcut) {
      definitions.push({
        hotkey: keepBlockShortcut,
        callback: (event) => {
          if (event.repeat || !activeBlockId || !isActiveBlockFocused()) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          void toggleKeepBlockWithFocus(activeBlockId);
        },
        options: {
          meta: { name: "Keep block" },
        },
      });
    }

    if (archiveBlockShortcut) {
      definitions.push({
        hotkey: archiveBlockShortcut,
        callback: (event) => {
          if (event.repeat || !activeBlockId || !isActiveBlockFocused()) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          void archiveBlockWithFocus(activeBlockId);
        },
        options: {
          meta: { name: "Archive block" },
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
  }, [
    activeBlockId,
    archiveBlockWithFocus,
    createBlockWithFocus,
    deleteBlockWithFocus,
    isActiveBlockFocused,
    shortcuts,
    toggleKeepBlockWithFocus,
  ]);

  useHotkeys(hotkeyDefinitions, {
    ignoreInputs: false,
    preventDefault: false,
    stopPropagation: false,
  });
}
