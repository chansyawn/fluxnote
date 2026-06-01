// @vitest-environment jsdom

import type { Block, Tag } from "@renderer/clients";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import {
  BlockEditorRegistryProvider,
  type BlockEditorRegistryContextValue,
} from "../editor-registry/block-editor-registry-context";
import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";
import type { WorkspaceBlockEditorHandle } from "./workspace-block-editor-surface";

const mocks = vi.hoisted(() => ({
  editorHandle: {
    copy: vi.fn(async () => undefined),
    executeAction: vi.fn((action) => ({ action, status: "executed" as const })),
    flush: vi.fn(async () => ""),
    focus: vi.fn(),
    getActionState: vi.fn(() => ({
      blockFormat: "paragraph",
      disabledActions: {
        "editor.blockquote": false,
        "editor.bold": false,
        "editor.bulletList": false,
        "editor.codeBlock": false,
        "editor.heading1": false,
        "editor.heading2": false,
        "editor.heading3": false,
        "editor.heading4": false,
        "editor.heading5": false,
        "editor.heading6": false,
        "editor.inlineCode": false,
        "editor.italic": false,
        "editor.orderedList": false,
        "editor.paragraph": false,
        "editor.strikethrough": false,
        "editor.taskList": false,
      },
      inlineFormats: {
        bold: false,
        inlineCode: false,
        italic: false,
        strikethrough: false,
      },
    })),
    subscribeActionState: vi.fn(() => () => undefined),
  },
  shortcutActionsByBlock: new Map<string, WorkspaceBlockActions>(),
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
    "workspace.togglePinBlock": "Mod+T",
    "workspace.submitExternalEdit": "Mod+Enter",
    "global.toggleWindow": "Alt+N",
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@renderer/features/shortcut/shortcut-state", () => ({
  useShortcutState: () => ({
    shortcuts: mocks.shortcuts,
  }),
}));

vi.mock("../shortcuts/use-workspace-block-shortcuts", () => ({
  useWorkspaceBlockActionShortcuts: () => vi.fn(),
}));

vi.mock("../adornments/block-adornments", () => ({
  BlockAdornments: ({
    actions,
    block,
    copyFeedbackActive,
  }: {
    actions: WorkspaceBlockActions;
    block: Block;
    copyFeedbackActive: boolean;
  }) => {
    mocks.shortcutActionsByBlock.set(block.id, actions);

    return (
      <button
        data-block-id={block.id}
        data-copied={String(copyFeedbackActive)}
        type="button"
        onClick={() => {
          void actions.copy();
        }}
      >
        Copy
      </button>
    );
  },
}));

vi.mock("./workspace-block-editor-surface", async () => {
  const React = await import("react");

  function setRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
    if (typeof ref === "function") {
      ref(value);
      return;
    }

    if (ref) {
      ref.current = value;
    }
  }

  return {
    WorkspaceBlockEditorSurface: ({
      adornments,
      block,
      onFocus,
      ref,
    }: {
      adornments?: React.ReactNode;
      block: Block;
      onFocus: (blockId: string) => void;
      ref?: React.Ref<WorkspaceBlockEditorHandle>;
    }) => {
      React.useEffect(() => {
        setRef(ref, mocks.editorHandle as WorkspaceBlockEditorHandle);
        return () => {
          setRef(ref, null);
        };
      }, [ref]);

      return (
        <article
          data-block-id={block.id}
          tabIndex={0}
          onFocus={() => {
            onFocus(block.id);
          }}
        >
          {adornments}
        </article>
      );
    },
  };
});

import { WorkspaceBlockEditor } from "./workspace-block-editor";

function createBlock(id: string): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    isKept: false,
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    isPendingAutoArchive: false,
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

function createCommands(): WorkspaceCommands {
  return {
    archiveBlock: vi.fn(async () => undefined),
    assignBlockTags: vi.fn(async () => createBlock("block-1")),
    cancelExternalEdit: vi.fn(async () => undefined),
    createBlockWithFocus: vi.fn(async () => undefined),
    createTag: vi.fn(async () => ({
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "tag-1",
      name: "Tag",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
    deleteBlock: vi.fn(async () => undefined),
    deleteTag: vi.fn(async () => undefined),
    focusBlock: vi.fn(),
    reorderBlock: vi.fn(async () => createBlock("block-1")),
    restoreBlock: vi.fn(async () => undefined),
    setBlockKeepState: vi.fn(async () => createBlock("block-1")),
    setBlockPinnedState: vi.fn(async () => createBlock("block-1")),
    submitExternalEdit: vi.fn(async () => undefined),
  };
}

function renderWorkspaceBlockEditors(blocks: Block[]) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const editors = new Map<string, WorkspaceBlockEditorHandle>();
  const registry: BlockEditorRegistryContextValue = {
    registerEditor: (blockId, handle) => {
      if (handle) {
        editors.set(blockId, handle);
        return;
      }

      editors.delete(blockId);
    },
    getEditor: (blockId) => editors.get(blockId),
  };

  act(() => {
    root.render(
      <BlockEditorRegistryProvider value={registry}>
        {blocks.map((block) => (
          <WorkspaceBlockEditor
            key={block.id}
            block={block}
            commands={createCommands()}
            position={{ canMoveDown: true, canMoveToTop: true, canMoveUp: true }}
            state={createState()}
            tags={[] satisfies Tag[]}
          />
        ))}
      </BlockEditorRegistryProvider>,
    );
  });

  return { container, root };
}

function getCopyButton(container: HTMLElement, blockId: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[data-block-id="${blockId}"]`);
  if (!button) {
    throw new Error(`Copy button for ${blockId} was not rendered.`);
  }
  return button;
}

describe("WorkspaceBlockEditor", () => {
  let mountedRoot: Root | null = null;
  let mountedContainer: HTMLElement | null = null;

  afterEach(() => {
    vi.useRealTimers();
    mocks.editorHandle.copy.mockClear();
    mocks.editorHandle.flush.mockClear();
    mocks.editorHandle.focus.mockClear();
    mocks.shortcutActionsByBlock.clear();

    if (mountedRoot) {
      act(() => {
        mountedRoot?.unmount();
      });
    }

    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
  });

  it("shows copy feedback only on the copied block for button and shortcut actions", async () => {
    vi.useFakeTimers();
    const { container, root } = renderWorkspaceBlockEditors([
      createBlock("block-1"),
      createBlock("block-2"),
    ]);
    mountedRoot = root;
    mountedContainer = container;

    await act(async () => {
      getCopyButton(container, "block-1").click();
      await Promise.resolve();
    });

    expect(mocks.editorHandle.copy).toHaveBeenCalledOnce();
    expect(getCopyButton(container, "block-1").dataset.copied).toBe("true");
    expect(getCopyButton(container, "block-2").dataset.copied).toBe("false");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(getCopyButton(container, "block-1").dataset.copied).toBe("false");

    const block2Actions = mocks.shortcutActionsByBlock.get("block-2");
    if (!block2Actions) {
      throw new Error("Shortcut actions were not registered.");
    }

    await act(async () => {
      await block2Actions.copy();
    });

    expect(mocks.editorHandle.copy).toHaveBeenCalledTimes(2);
    expect(getCopyButton(container, "block-2").dataset.copied).toBe("true");
    expect(getCopyButton(container, "block-1").dataset.copied).toBe("false");
  });
});
