import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import {
  keyboardEventMatchesShortcut,
  type ShortcutBinding,
} from "@renderer/features/shortcut/shortcut-utils";
import type { BlockCreatedSource } from "@shared/features/telemetry/contract";
import {
  useHotkeys,
  type UseHotkeyDefinition,
  type UseHotkeyOptions,
} from "@tanstack/react-hotkeys";
import { useCallback, useMemo, type KeyboardEvent as ReactKeyboardEvent } from "react";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { WorkspaceBlockState } from "../workspace-state-context";

interface ShortcutDefinitionParams {
  callback: () => Promise<void>;
  canRun: () => boolean;
  hotkey: ShortcutBinding;
  name: string;
}

export interface UseWorkspaceCreateBlockShortcutParams {
  createBlockWithFocus: (source: BlockCreatedSource) => Promise<void>;
}

export interface UseWorkspaceBlockActionShortcutsParams {
  actions: WorkspaceBlockActions;
  isActiveBlockEditorFocused: () => boolean;
  state: WorkspaceBlockState;
  target: UseHotkeyOptions["target"];
}

export type WorkspaceBlockActionShortcutCaptureHandler = (
  event: ReactKeyboardEvent<HTMLElement>,
) => void;

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
  const createFromShortcut = useCallback(
    () => createBlockWithFocus("workspace_shortcut"),
    [createBlockWithFocus],
  );

  const hotkeyDefinitions = useMemo<UseHotkeyDefinition[]>(() => {
    const createDefinition = createShortcutDefinition({
      hotkey: shortcuts["workspace.createBlock"],
      callback: createFromShortcut,
      canRun: () => true,
      name: "Create block",
    });

    return createDefinition ? [createDefinition] : [];
  }, [createFromShortcut, shortcuts]);

  useWorkspaceHotkeys(hotkeyDefinitions);
}

export function useWorkspaceBlockActionShortcuts({
  actions,
  isActiveBlockEditorFocused,
  state,
  target,
}: UseWorkspaceBlockActionShortcutsParams): WorkspaceBlockActionShortcutCaptureHandler {
  const { shortcuts } = useShortcutState();
  const hasExternalEditSession = Boolean(state.externalEditSession);
  const canRunExternalEditAction = useCallback(
    () => hasExternalEditSession && !state.isExternalEditPending && isActiveBlockEditorFocused(),
    [hasExternalEditSession, isActiveBlockEditorFocused, state.isExternalEditPending],
  );

  const hotkeyDefinitions = useMemo<UseHotkeyDefinition[]>(() => {
    const canRunFocusedBlockAction = () => !state.isLocked && isActiveBlockEditorFocused();
    const definitions = [
      createShortcutDefinition({
        hotkey: shortcuts["workspace.copyBlock"],
        callback: actions.copy,
        canRun: canRunFocusedBlockAction,
        name: "Copy block",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["workspace.keepBlock"],
        callback: actions.toggleKeep,
        canRun: canRunFocusedBlockAction,
        name: "Keep block",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["workspace.togglePinBlock"],
        callback: actions.togglePinned,
        canRun: canRunFocusedBlockAction,
        name: "Pin or unpin block",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["workspace.archiveBlock"],
        callback: actions.toggleArchive,
        canRun: canRunFocusedBlockAction,
        name: "Archive or restore block",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["workspace.deleteBlock"],
        callback: actions.deleteOrCancelExternalEdit,
        canRun: () =>
          isActiveBlockEditorFocused() &&
          (hasExternalEditSession ? !state.isExternalEditPending : !state.isLocked),
        name: "Delete block or cancel external edit",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["workspace.submitExternalEdit"],
        callback: actions.submitExternalEdit,
        canRun: canRunExternalEditAction,
        name: "Submit external edit",
      }),
      createShortcutDefinition({
        hotkey: shortcuts["workspace.cancelExternalEdit"],
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
    actions.copy,
    actions.deleteOrCancelExternalEdit,
    actions.submitExternalEdit,
    actions.toggleArchive,
    actions.toggleKeep,
    actions.togglePinned,
    canRunExternalEditAction,
    hasExternalEditSession,
    isActiveBlockEditorFocused,
    shortcuts,
    state.isExternalEditPending,
    state.isLocked,
  ]);

  useWorkspaceHotkeys(hotkeyDefinitions, { target });

  return useCallback(
    (event) => {
      if (event.repeat || !canRunExternalEditAction()) {
        return;
      }

      if (keyboardEventMatchesShortcut(event, shortcuts["workspace.submitExternalEdit"])) {
        event.preventDefault();
        event.stopPropagation();
        void actions.submitExternalEdit();
        return;
      }

      if (keyboardEventMatchesShortcut(event, shortcuts["workspace.cancelExternalEdit"])) {
        event.preventDefault();
        event.stopPropagation();
        void actions.cancelExternalEdit();
      }
    },
    [actions.cancelExternalEdit, actions.submitExternalEdit, canRunExternalEditAction, shortcuts],
  );
}
