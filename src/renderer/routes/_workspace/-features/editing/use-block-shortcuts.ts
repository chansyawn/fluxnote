import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useMemo } from "react";

import type { ActiveBlockFocus } from "../navigation/use-active-block-focus";

export interface UseBlockShortcutsParams {
  activeBlockFocus: ActiveBlockFocus;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  toggleArchiveBlockWithFocus: (blockId: string) => Promise<void>;
  toggleKeepBlockWithFocus: (blockId: string) => Promise<void>;
}

export function useBlockShortcuts({
  activeBlockFocus,
  createBlockWithFocus,
  deleteBlockWithFocus,
  toggleArchiveBlockWithFocus,
  toggleKeepBlockWithFocus,
}: UseBlockShortcutsParams): void {
  const { shortcuts } = useShortcutState();
  const { activeBlockId, isActiveBlockEditorFocused } = activeBlockFocus;

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
          if (event.repeat || !activeBlockId || !isActiveBlockEditorFocused()) {
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
          if (event.repeat || !activeBlockId || !isActiveBlockEditorFocused()) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          void toggleArchiveBlockWithFocus(activeBlockId);
        },
        options: {
          meta: { name: "Archive or restore block" },
        },
      });
    }

    if (deleteBlockShortcut) {
      definitions.push({
        hotkey: deleteBlockShortcut,
        callback: (event) => {
          if (event.repeat || !activeBlockId || !isActiveBlockEditorFocused()) {
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
    createBlockWithFocus,
    deleteBlockWithFocus,
    isActiveBlockEditorFocused,
    shortcuts,
    toggleArchiveBlockWithFocus,
    toggleKeepBlockWithFocus,
  ]);

  useHotkeys(hotkeyDefinitions, {
    ignoreInputs: false,
    preventDefault: false,
    stopPropagation: false,
  });
}
