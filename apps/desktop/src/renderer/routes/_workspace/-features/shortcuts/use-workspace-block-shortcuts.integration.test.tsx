// @vitest-environment jsdom

import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { WorkspaceBlockState } from "../workspace-state-context";

const mocks = vi.hoisted(() => ({
  shortcuts: {
    "workspace.archiveBlock": "Mod+E",
    "workspace.cancelExternalEdit": "Mod+\\",
    "workspace.copyBlock": "Mod+Shift+C",
    "workspace.createBlock": "Mod+N",
    "workspace.deleteBlock": "Mod+D",
    "editor.bold": "Mod+B",
    "editor.inlineCode": "Mod+Shift+E",
    "editor.italic": "Mod+I",
    "editor.strikethrough": "Mod+Shift+X",
    "workspace.keepBlock": "Mod+K",
    "workspace.submitExternalEdit": "Mod+Enter",
    "workspace.togglePinBlock": "Mod+T",
    "global.toggleWindow": "Alt+N",
  },
}));

vi.mock("@renderer/features/shortcut/shortcut-state", () => ({
  useShortcutState: () => ({
    shortcuts: mocks.shortcuts,
  }),
}));

import { useWorkspaceBlockActionShortcuts } from "./use-workspace-block-shortcuts";

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

function createState(): WorkspaceBlockState {
  return {
    externalEditSession: undefined,
    isArchivePending: false,
    isDeletePending: false,
    isExternalEditPending: false,
    isKeepPending: false,
    isLocked: false,
    isPinnedPending: false,
    isReorderPending: false,
    isTagCreatePending: false,
    visibility: "active",
  };
}

function BlockShortcutTarget({
  actions,
  state,
}: {
  actions: WorkspaceBlockActions;
  state: WorkspaceBlockState;
}) {
  const target = useRef<HTMLDivElement | null>(null);

  useWorkspaceBlockActionShortcuts({
    actions,
    isActiveBlockEditorFocused: () => true,
    state,
    target,
  });

  return <div ref={target} />;
}

describe("workspace block shortcut registration", () => {
  let mountedRoot: Root | null = null;
  let mountedContainer: HTMLDivElement | null = null;

  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot?.unmount();
      });
    }
    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
    vi.restoreAllMocks();
  });

  it("registers repeated block shortcuts on separate targets without conflict warnings", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);

    await act(async () => {
      mountedRoot?.render(
        <>
          <BlockShortcutTarget actions={createActions()} state={createState()} />
          <BlockShortcutTarget actions={createActions()} state={createState()} />
        </>,
      );
    });

    const duplicateWarnings = warn.mock.calls.filter(([message]) => {
      return typeof message === "string" && message.includes("already registered");
    });
    expect(duplicateWarnings).toHaveLength(0);
  });
});
