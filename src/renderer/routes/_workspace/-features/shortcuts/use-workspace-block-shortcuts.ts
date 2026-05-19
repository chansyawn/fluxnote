import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import type { ShortcutBinding } from "@renderer/features/shortcut/shortcut-utils";
import {
  useHotkeys,
  type UseHotkeyDefinition,
  type UseHotkeyOptions,
} from "@tanstack/react-hotkeys";
import { useMemo } from "react";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { WorkspaceBlockState } from "../workspace-state-context";

interface ShortcutDefinitionParams {
  callback: () => Promise<void>;
  canRun: () => boolean;
  hotkey: ShortcutBinding;
  name: string;
}

export interface UseWorkspaceCreateBlockShortcutParams {
  createBlockWithFocus: () => Promise<void>;
}

export interface UseWorkspaceBlockActionShortcutsParams {
  actions: WorkspaceBlockActions;
  isActiveBlockEditorFocused: () => boolean;
  state: WorkspaceBlockState;
  target: UseHotkeyOptions["target"];
}

function createShortcutDefinition({
  callback,
  canRun,
  hotkey,
  name,
}: ShortcutDefinitionParams): UseHotkeyDefinition | null {
  if (!hotkey) {
    return null;
  }

  return {
    hotkey,
    callback: (event) => {
      if (event.repeat || !canRun()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void callback();
    },
    options: {
      meta: { name },
    },
  };
}

function useWorkspaceHotkeys(
  definitions: UseHotkeyDefinition[],
  options?: Pick<UseHotkeyOptions, "target">,
): void {
  useHotkeys(definitions, {
    ignoreInputs: false,
    preventDefault: false,
    stopPropagation: false,
    target: options?.target,
  });
}

export function useWorkspaceCreateBlockShortcut({
  createBlockWithFocus,
}: UseWorkspaceCreateBlockShortcutParams): void {
  const { shortcuts } = useShortcutState();

  const hotkeyDefinitions = useMemo<UseHotkeyDefinition[]>(() => {
    const createDefinition = createShortcutDefinition({
      hotkey: shortcuts["create-block"],
      callback: createBlockWithFocus,
      canRun: () => true,
      name: "Create block",
    });

    return createDefinition ? [createDefinition] : [];
  }, [createBlockWithFocus, shortcuts]);

  useWorkspaceHotkeys(hotkeyDefinitions);
}

export function useWorkspaceBlockActionShortcuts({
  actions,
  isActiveBlockEditorFocused,
  state,
  target,
}: UseWorkspaceBlockActionShortcutsParams): void {
  const { shortcuts } = useShortcutState();

  const hotkeyDefinitions = useMemo<UseHotkeyDefinition[]>(() => {
    const hasExternalEditSession = Boolean(state.externalEditSession);
    const canRunFocusedBlockAction = () => !state.isLocked && isActiveBlockEditorFocused();
    const canRunExternalEditAction = () =>
      hasExternalEditSession && !state.isExternalEditPending && isActiveBlockEditorFocused();
    const definitions = [
      createShortcutDefinition({
        hotkey: shortcuts["keep-block"],
        callback: actions.toggleKeep,
        canRun: canRunFocusedBlockAction,
        name: "Keep block",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["archive-block"],
        callback: actions.toggleArchive,
        canRun: canRunFocusedBlockAction,
        name: "Archive or restore block",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["delete-block"],
        callback: actions.deleteOrCancelExternalEdit,
        canRun: () =>
          isActiveBlockEditorFocused() &&
          (hasExternalEditSession ? !state.isExternalEditPending : !state.isLocked),
        name: "Delete block or cancel external edit",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["submit-external-edit"],
        callback: actions.submitExternalEdit,
        canRun: canRunExternalEditAction,
        name: "Submit external edit",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["cancel-external-edit"],
        callback: actions.cancelExternalEdit,
        canRun: canRunExternalEditAction,
        name: "Cancel external edit",
      }),
    ];

    return definitions.filter((definition): definition is UseHotkeyDefinition =>
      Boolean(definition),
    );
  }, [
    actions.cancelExternalEdit,
    actions.deleteOrCancelExternalEdit,
    actions.submitExternalEdit,
    actions.toggleArchive,
    actions.toggleKeep,
    isActiveBlockEditorFocused,
    shortcuts,
    state.externalEditSession,
    state.isExternalEditPending,
    state.isLocked,
  ]);

  useWorkspaceHotkeys(hotkeyDefinitions, { target });
}
