// @vitest-environment jsdom

import { DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE } from "@renderer/features/block-editor/toolbar";
import { renderWithProviders } from "@renderer/test/render";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  focusBlock: vi.fn(),
}));

vi.mock("@renderer/features/block-editor", () => ({
  BlockEditorToolbar: ({ controller }: { controller?: unknown }) => (
    <button disabled={!controller} type="button">
      Editor toolbar
    </button>
  ),
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
      isInitialLoading: false,
      totalBlockCount: 1,
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
      activeEditor: {
        copy: vi.fn(async () => undefined),
        flush: vi.fn(async () => ""),
        focus: vi.fn(),
        formatText: vi.fn(),
        getToolbarState: () => DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
        subscribeToolbarState: () => () => undefined,
      },
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
  it("keeps the active Block while focus moves from the editor into the toolbar", () => {
    renderWithProviders(<BlockWorkspace />);
    const blockEditor = screen.getByRole("button", { name: "Block editor" });
    const toolbar = screen.getByRole("button", { name: "Editor toolbar" });

    blockEditor.focus();
    fireEvent.blur(blockEditor, { relatedTarget: toolbar });

    expect(mocks.focusBlock).not.toHaveBeenCalledWith(null);
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
