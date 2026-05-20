import type { ExternalEditSession } from "@renderer/clients";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { WorkspaceBlockActionShortcutCaptureHandler } from "./use-workspace-block-shortcuts";

const mocks = vi.hoisted(() => {
  const defaultShortcuts = {
    "archive-block": "Mod+E",
    "cancel-external-edit": "Mod+\\",
    "copy-block": "Mod+Shift+C",
    "create-block": "Mod+N",
    "delete-block": "Mod+D",
    "keep-block": "Mod+K",
    "submit-external-edit": "Mod+Enter",
    "toggle-pin-block": "Mod+T",
  } as const;

  return {
    defaultShortcuts,
    shortcuts: { ...defaultShortcuts } as Record<string, string | null>,
    useHotkeys: vi.fn(),
  };
});

vi.mock("react", () => ({
  useCallback: <T extends (...args: never[]) => unknown>(callback: T) => callback,
  useMemo: <T>(factory: () => T) => factory(),
}));

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
} from "./use-workspace-block-shortcuts";

type ShortcutCallback = (event: KeyboardEvent & { repeat: boolean }) => void;

interface CapturedShortcutDefinition {
  hotkey: string;
  callback: ShortcutCallback;
}

interface CapturedShortcutOptions {
  target?: unknown;
}

const externalEditSession: ExternalEditSession = {
  blockId: "block-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  editId: "edit-1",
  trigger: {
    cwd: "/tmp",
    requestedFilePath: "/tmp/requested.md",
    source: "cli",
    targetFilePath: "/tmp/target.md",
  },
};

function createActions() {
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
}) {
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
    visibility: overrides?.visibility ?? ("active" as const),
  };
}

function getDefinitions(): CapturedShortcutDefinition[] {
  return mocks.useHotkeys.mock.calls.at(-1)?.[0] as CapturedShortcutDefinition[];
}

function getOptions(): CapturedShortcutOptions {
  return mocks.useHotkeys.mock.calls.at(-1)?.[1] as CapturedShortcutOptions;
}

function createShortcutTarget() {
  return { current: null };
}

function triggerShortcut(hotkey: string) {
  const definition = getDefinitions().find((candidate) => candidate.hotkey === hotkey);
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();

  definition?.callback({
    repeat: false,
    preventDefault,
    stopPropagation,
  } as unknown as KeyboardEvent & { repeat: boolean });

  return { preventDefault, stopPropagation };
}

type ShortcutCaptureEvent = Parameters<WorkspaceBlockActionShortcutCaptureHandler>[0] & {
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
};

function createModModifierKeys() {
  return process.platform === "darwin"
    ? { ctrlKey: false, metaKey: true }
    : { ctrlKey: true, metaKey: false };
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
  } as ShortcutCaptureEvent;
}

describe("workspace block shortcuts", () => {
  beforeEach(() => {
    Object.assign(mocks.shortcuts, mocks.defaultShortcuts);
    mocks.useHotkeys.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("triggers create block without active block focus", () => {
    const createBlockWithFocus = vi.fn(async () => undefined);

    useWorkspaceCreateBlockShortcut({ createBlockWithFocus });

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+N");

    expect(createBlockWithFocus).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(getOptions().target).toBeUndefined();
  });

  it("keeps focused block action guard", () => {
    const actions = createActions();
    const target = createShortcutTarget();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => false,
      state: createState(),
      target,
    });

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+K");

    expect(actions.toggleKeep).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(getOptions().target).toBe(target);
  });

  it("runs focused block action", () => {
    const actions = createActions();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState(),
      target: createShortcutTarget(),
    });

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+E");

    expect(actions.toggleArchive).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("toggles pin on focused block shortcut", () => {
    const actions = createActions();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState(),
      target: createShortcutTarget(),
    });

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+T");

    expect(actions.togglePinned).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("copies focused archived block", () => {
    const actions = createActions();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ visibility: "archived" }),
      target: createShortcutTarget(),
    });

    const { preventDefault, stopPropagation } = triggerShortcut("Mod+Shift+C");

    expect(actions.copy).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("blocks shortcuts while block is locked", () => {
    const actions = createActions();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ isLocked: true }),
      target: createShortcutTarget(),
    });

    triggerShortcut("Mod+D");
    triggerShortcut("Mod+Shift+C");

    expect(actions.deleteOrCancelExternalEdit).not.toHaveBeenCalled();
    expect(actions.copy).not.toHaveBeenCalled();
  });

  it("runs external edit shortcut only for active non-pending session", () => {
    const actions = createActions();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ externalEditSession }),
      target: createShortcutTarget(),
    });

    triggerShortcut("Mod+Enter");

    expect(actions.submitExternalEdit).toHaveBeenCalledOnce();
  });

  it("captures external edit submit before the editor handles Enter", () => {
    const actions = createActions();

    const handleKeyDownCapture = useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ externalEditSession }),
      target: createShortcutTarget(),
    });
    const event = createKeyboardCaptureEvent();

    handleKeyDownCapture(event);

    expect(actions.submitExternalEdit).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("captures external edit cancel before the editor handles the shortcut", () => {
    const actions = createActions();

    const handleKeyDownCapture = useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ externalEditSession }),
      target: createShortcutTarget(),
    });
    const event = createKeyboardCaptureEvent({ key: "\\" });

    handleKeyDownCapture(event);

    expect(actions.cancelExternalEdit).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("does not capture external edit shortcuts when the action cannot run", () => {
    const actions = createActions();

    const handleKeyDownCapture = useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ externalEditSession, isExternalEditPending: true }),
      target: createShortcutTarget(),
    });
    const event = createKeyboardCaptureEvent();

    handleKeyDownCapture(event);

    expect(actions.submitExternalEdit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it("does not capture repeated external edit shortcuts", () => {
    const actions = createActions();

    const handleKeyDownCapture = useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ externalEditSession }),
      target: createShortcutTarget(),
    });
    const event = createKeyboardCaptureEvent({ repeat: true });

    handleKeyDownCapture(event);

    expect(actions.submitExternalEdit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it("blocks external edit shortcut while submission is pending", () => {
    const actions = createActions();

    useWorkspaceBlockActionShortcuts({
      actions,
      isActiveBlockEditorFocused: () => true,
      state: createState({ externalEditSession, isExternalEditPending: true }),
      target: createShortcutTarget(),
    });

    triggerShortcut("Mod+\\");

    expect(actions.cancelExternalEdit).not.toHaveBeenCalled();
  });
});
