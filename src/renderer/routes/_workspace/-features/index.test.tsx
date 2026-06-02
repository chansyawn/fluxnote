// @vitest-environment jsdom

import { DEFAULT_BLOCK_EDITOR_ACTION_STATE } from "@renderer/features/block-editor";
import { renderWithProviders } from "@renderer/test/render";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  activeEditorEnabled: true,
  focusBlock: vi.fn(),
  isInitialLoading: false,
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
    "global.quickCreateBlock": "Ctrl+Alt+N",
    "workspace.submitExternalEdit": "Mod+Enter",
    "workspace.togglePinBlock": "Mod+T",
    "global.toggleWindow": "Alt+N",
  },
  totalBlockCount: 1,
}));

vi.mock("@renderer/features/block-editor", () => ({
  BLOCK_EDITOR_ACTION_DEFINITIONS: [
    { id: "editor.bold" },
    { id: "editor.inlineCode" },
    { id: "editor.italic" },
    { id: "editor.strikethrough" },
  ],
  BlockEditorToolbar: ({
    controller,
    inactiveContent,
  }: {
    controller?: unknown;
    inactiveContent?: ReactNode;
  }) =>
    controller ? (
      <div>
        <button type="button">Editor toolbar</button>
        <button type="button">Editor toolbar menu</button>
      </div>
    ) : (
      <div tabIndex={0}>{inactiveContent}</div>
    ),
}));

vi.mock("@renderer/features/shortcut/shortcut-state", () => ({
  useShortcutState: () => ({
    shortcuts: mocks.shortcuts,
  }),
}));

vi.mock("./view/workspace-titlebar-actions-portal", () => ({
  WorkspaceTitlebarActionsPortal: () => null,
}));

vi.mock("./view/workspace-empty-state", () => ({
  LoadingState: () => null,
  WorkspaceArchivedEmptyState: () => null,
  WorkspaceEmptyState: () => null,
  WorkspaceFilteredEmptyState: () => null,
}));

vi.mock("./list/virtual-block-list", () => ({
  VirtualBlockList: () => <button type="button">Block editor</button>,
}));

vi.mock("./workspace-runtime", () => ({
  useWorkspaceRuntime: () => ({
    blockList: {
      ensureBlockRange: vi.fn(),
      getBlockAtIndex: vi.fn(),
      isInitialLoading: mocks.isInitialLoading,
      totalBlockCount: mocks.totalBlockCount,
    },
    blockMutations: {
      isCreatingBlock: false,
    },
    blockNavigation: {
      activeBlockId: "block-1",
      scrollTarget: null,
      targetRendered: vi.fn(),
    },
    commands: {
      createBlockWithFocus: vi.fn(async () => undefined),
      createTag: vi.fn(async () => ({
        createdAt: "2026-01-01T00:00:00.000Z",
        id: "tag-1",
        name: "Tag",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
      deleteTag: vi.fn(async () => undefined),
      focusBlock: mocks.focusBlock,
    },
    editorRegistry: {
      activeEditor: mocks.activeEditorEnabled
        ? {
            copy: vi.fn(async () => undefined),
            executeAction: vi.fn((action) => ({
              action,
              focus: "editor" as const,
              status: "executed" as const,
            })),
            flush: vi.fn(async () => ""),
            focus: vi.fn(),
            getActionState: () => DEFAULT_BLOCK_EDITOR_ACTION_STATE,
            subscribeActionState: () => () => undefined,
          }
        : undefined,
      getEditor: vi.fn(),
      registerEditor: vi.fn(),
    },
    tagData: {
      isTagOpPending: vi.fn(() => false),
      tags: [],
    },
    viewState: {
      addTagFilter: vi.fn(),
      removeTagFilter: vi.fn(),
      selectedTagIds: [],
      setSelectedTagIds: vi.fn(),
      setVisibility: vi.fn(),
      visibility: "active",
    },
    workspaceContextValue: {
      commands: {},
      runtime: {
        pendingBlockOps: {},
        pendingExternalEditIds: new Set(),
        sessionsByBlockId: new Map(),
      },
      view: {
        isTagCreatePending: false,
        tags: [],
        visibility: "active",
      },
    },
  }),
}));

import { BlockWorkspace } from ".";

describe("BlockWorkspace", () => {
  beforeEach(() => {
    mocks.activeEditorEnabled = true;
    mocks.focusBlock.mockClear();
    mocks.isInitialLoading = false;
    mocks.totalBlockCount = 1;
  });

  it("keeps the active Block while focus moves from the editor into the toolbar", () => {
    renderWithProviders(<BlockWorkspace />);
    const blockEditor = screen.getByRole("button", { name: "Block editor" });
    const toolbar = screen.getByRole("button", { name: "Editor toolbar" });

    blockEditor.focus();
    fireEvent.blur(blockEditor, { relatedTarget: toolbar });

    expect(mocks.focusBlock).not.toHaveBeenCalledWith(null);
  });

  it("keeps the active Block while focus moves into a toolbar dropdown", () => {
    renderWithProviders(<BlockWorkspace />);
    const toolbar = screen.getByRole("button", { name: "Editor toolbar" });
    const toolbarMenu = screen.getByRole("button", { name: "Editor toolbar menu" });

    toolbar.focus();
    fireEvent.blur(toolbar, { relatedTarget: toolbarMenu });

    expect(mocks.focusBlock).not.toHaveBeenCalledWith(null);
  });

  it("passes the current view block count as inactive toolbar content", () => {
    mocks.activeEditorEnabled = false;
    mocks.totalBlockCount = 2;

    renderWithProviders(<BlockWorkspace />);

    expect(screen.getByText("2 blocks")).toBeVisible();
  });

  it("clears the active Block when focus leaves the Workspace editing area", () => {
    renderWithProviders(<BlockWorkspace />);
    const toolbar = screen.getByRole("button", { name: "Editor toolbar" });
    const outsideButton = document.createElement("button");
    document.body.append(outsideButton);

    toolbar.focus();
    fireEvent.blur(toolbar, { relatedTarget: outsideButton });

    expect(mocks.focusBlock).toHaveBeenCalledWith(null);
  });
});
