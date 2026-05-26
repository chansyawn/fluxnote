// @vitest-environment jsdom

import type { ExternalEditSession } from "@renderer/clients";
import type { WorkspaceBlockActions } from "@renderer/routes/_workspace/-features/actions/workspace-block-actions";
import type { WorkspaceBlockState } from "@renderer/routes/_workspace/-features/workspace-state-context";
import { createExternalEditSession } from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import type { BlockCreatedSource } from "@shared/features/telemetry/contract";
import type { UseHotkeyDefinition, UseHotkeyOptions } from "@tanstack/react-hotkeys";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  const defaultShortcuts = {
    archiveBlock: "Mod+E",
    cancelExternalEdit: "Mod+\\",
    copyBlock: "Mod+Shift+C",
    createBlock: "Mod+N",
    deleteBlock: "Mod+D",
    keepBlock: "Mod+K",
    quickCreateBlock: "Ctrl+Alt+N",
    submitExternalEdit: "Mod+Enter",
    togglePinBlock: "Mod+T",
    toggleWindow: "Alt+N",
  } as const;

  return {
    defaultShortcuts,
    shortcuts: { ...defaultShortcuts } as Record<string, string | null>,
    useHotkeys: vi.fn(),
  };
});

vi.mock("@renderer/features/shortcut/shortcut-state", () => ({
  useShortcutState: () => ({
    shortcuts: mocks.shortcuts,
  }),
}));

vi.mock("@tanstack/react-hotkeys", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-hotkeys")>();
  return {
    ...actual,
    useHotkeys: mocks.useHotkeys,
  };
});

import {
  useWorkspaceBlockActionShortcuts,
  useWorkspaceCreateBlockShortcut,
  type WorkspaceBlockActionShortcutCaptureHandler,
} from "./use-workspace-block-shortcuts";

type CapturedShortcutDefinition = UseHotkeyDefinition & {
  callback: (event: KeyboardEvent & { repeat: boolean }) => void;
};

type CapturedShortcutOptions = Pick<UseHotkeyOptions, "target">;

function createActions(): WorkspaceBlockActions {
  return {
    assignTags: vi.fn(async () => undefined),
    cancelExternalEdit: vi.fn(async () => undefined),
    copy: vi.fn(async () => undefined),
    createTag: vi.fn(async () => undefined),
    deleteOrCancelExternalEdit: vi.fn(async () => undefined),
    reorder: vi.fn(async () => undefined),
    submitExternalEdit: vi.fn(async () => undefined),
    toggleArchive: vi.fn(async () => undefined),
    toggleKeep: vi.fn(async () => undefined),
    togglePinned: vi.fn(async () => undefined),
  };
}

function createState(overrides?: {
  externalEditSession?: ExternalEditSession | undefined;
  isExternalEditPending?: boolean;
  isLocked?: boolean;
  visibility?: "active" | "archived";
}): WorkspaceBlockState {
  return {
    externalEditSession: overrides?.externalEditSession,
    isArchivePending: false,
    isDeletePending: false,
    isExternalEditPending: overrides?.isExternalEditPending ?? false,
    isKeepPending: false,
    isLocked: overrides?.isLocked ?? false,
    isPinnedPending: false,
    isReorderPending: false,
    isTagCreatePending: false,
    visibility: overrides?.visibility ?? "active",
  };
}

function WorkspaceCreateShortcutProbe({
  createBlockWithFocus,
}: {
  createBlockWithFocus: (source: BlockCreatedSource) => Promise<void>;
}) {
  useWorkspaceCreateBlockShortcut({ createBlockWithFocus });
  return null;
}

function WorkspaceBlockShortcutProbe({
  actions,
  isFocused = true,
  onCapture,
  state,
}: {
  actions: WorkspaceBlockActions;
  isFocused?: boolean;
  onCapture?: (handler: WorkspaceBlockActionShortcutCaptureHandler) => void;
  state: WorkspaceBlockState;
}) {
  const target = useRef<HTMLDivElement | null>(null);
  const handleCapture = useWorkspaceBlockActionShortcuts({
    actions,
    isActiveBlockEditorFocused: () => isFocused,
    state,
    target,
  });
  onCapture?.(handleCapture);
  return <div ref={target} />;
}

function getDefinitions(): CapturedShortcutDefinition[] {
  return mocks.useHotkeys.mock.calls.at(-1)?.[0] as CapturedShortcutDefinition[];
}

function getOptions(): CapturedShortcutOptions {
  return mocks.useHotkeys.mock.calls.at(-1)?.[1] as CapturedShortcutOptions;
}

function triggerShortcut(hotkey: string) {
  const definition = getDefinitions().find((candidate) => candidate.hotkey === hotkey);
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();

  if (!definition) {
    throw new Error(`Shortcut ${hotkey} was not registered.`);
  }

  definition.callback({
    repeat: false,
    preventDefault,
    stopPropagation,
  } as unknown as KeyboardEvent & { repeat: boolean });

  return { preventDefault, stopPropagation };
}

function createModModifierKeys() {
  return { ctrlKey: true, metaKey: false };
}

function createKeyboardCaptureEvent(
  overrides?: Partial<
    Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">
  > & {
    repeat?: boolean;
  },
) {
  return {
    altKey: false,
    key: "Enter",
    ...createModModifierKeys(),
    repeat: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as Parameters<WorkspaceBlockActionShortcutCaptureHandler>[0] & {
    preventDefault: ReturnType<typeof vi.fn>;
    stopPropagation: ReturnType<typeof vi.fn>;
  };
}

describe("workspace block shortcuts", () => {
  beforeEach(() => {
    Object.assign(mocks.shortcuts, mocks.defaultShortcuts);
    mocks.useHotkeys.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets the user create a Block without requiring an active Block Editor", () => {
    const createBlockWithFocus = vi.fn(async () => undefined);

    renderWithProviders(
      <WorkspaceCreateShortcutProbe createBlockWithFocus={createBlockWithFocus} />,
    );

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+N");

    expect(createBlockWithFocus).toHaveBeenCalledWith("workspace_shortcut");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(getOptions().target).toBeUndefined();
  });

  it("guards focused Block actions when the active Block Editor is not focused", () => {
    const actions = createActions();

    renderWithProviders(
      <WorkspaceBlockShortcutProbe actions={actions} isFocused={false} state={createState()} />,
    );

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+K");

    expect(actions.toggleKeep).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(getOptions().target).toHaveProperty("current");
  });

  it("runs focused Workspace Block shortcuts", () => {
    const actions = createActions();

    renderWithProviders(<WorkspaceBlockShortcutProbe actions={actions} state={createState()} />);

    triggerShortcut("Mod+E");
    triggerShortcut("Mod+T");
    triggerShortcut("Mod+Shift+C");

    expect(actions.toggleArchive).toHaveBeenCalledOnce();
    expect(actions.togglePinned).toHaveBeenCalledOnce();
    expect(actions.copy).toHaveBeenCalledOnce();
  });

  it("blocks regular Block shortcuts while the Workspace Block is locked", () => {
    const actions = createActions();

    renderWithProviders(
      <WorkspaceBlockShortcutProbe actions={actions} state={createState({ isLocked: true })} />,
    );

    triggerShortcut("Mod+D");
    triggerShortcut("Mod+Shift+C");

    expect(actions.deleteOrCancelExternalEdit).not.toHaveBeenCalled();
    expect(actions.copy).not.toHaveBeenCalled();
  });

  it("runs External Edit shortcuts only while an active session can be handled", () => {
    const actions = createActions();

    renderWithProviders(
      <WorkspaceBlockShortcutProbe
        actions={actions}
        state={createState({ externalEditSession: createExternalEditSession() })}
      />,
    );

    triggerShortcut("Mod+Enter");
    triggerShortcut("Mod+\\");

    expect(actions.submitExternalEdit).toHaveBeenCalledOnce();
    expect(actions.cancelExternalEdit).toHaveBeenCalledOnce();
  });

  it("captures External Edit submit before the Block Editor handles Enter", () => {
    const actions = createActions();
    let handleKeyDownCapture: WorkspaceBlockActionShortcutCaptureHandler = () => undefined;

    renderWithProviders(
      <WorkspaceBlockShortcutProbe
        actions={actions}
        state={createState({ externalEditSession: createExternalEditSession() })}
        onCapture={(handler) => {
          handleKeyDownCapture = handler;
        }}
      />,
    );
    const event = createKeyboardCaptureEvent();

    handleKeyDownCapture(event);

    expect(actions.submitExternalEdit).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("does not capture External Edit shortcuts when the session is pending or repeated", () => {
    const actions = createActions();
    let handleKeyDownCapture: WorkspaceBlockActionShortcutCaptureHandler = () => undefined;

    renderWithProviders(
      <WorkspaceBlockShortcutProbe
        actions={actions}
        state={createState({
          externalEditSession: createExternalEditSession(),
          isExternalEditPending: true,
        })}
        onCapture={(handler) => {
          handleKeyDownCapture = handler;
        }}
      />,
    );
    const pendingEvent = createKeyboardCaptureEvent();

    handleKeyDownCapture(pendingEvent);

    expect(actions.submitExternalEdit).not.toHaveBeenCalled();
    expect(pendingEvent.preventDefault).not.toHaveBeenCalled();

    const repeatedActions = createActions();
    let repeatedCapture: WorkspaceBlockActionShortcutCaptureHandler = () => undefined;
    renderWithProviders(
      <WorkspaceBlockShortcutProbe
        actions={repeatedActions}
        state={createState({ externalEditSession: createExternalEditSession() })}
        onCapture={(handler) => {
          repeatedCapture = handler;
        }}
      />,
    );
    const repeatedEvent = createKeyboardCaptureEvent({ repeat: true });

    repeatedCapture(repeatedEvent);

    expect(repeatedActions.submitExternalEdit).not.toHaveBeenCalled();
    expect(repeatedEvent.preventDefault).not.toHaveBeenCalled();
  });
});
