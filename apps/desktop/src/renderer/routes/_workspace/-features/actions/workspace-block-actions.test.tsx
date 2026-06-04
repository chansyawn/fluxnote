// @vitest-environment jsdom

import { DEFAULT_BLOCK_EDITOR_ACTION_STATE } from "@fluxnotes/editor";
import type { WorkspaceBlockEditorHandle } from "@renderer/routes/_workspace/-features/editor/workspace-block-editor-surface";
import type { WorkspaceCommands } from "@renderer/routes/_workspace/-features/workspace-state-context";
import {
  createExternalEditSession,
  createRendererBlock,
  createRendererTag,
} from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import { useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { useWorkspaceBlockActions, type WorkspaceBlockActions } from "./workspace-block-actions";

function createState(overrides?: {
  externalEditSession?: ReturnType<typeof createExternalEditSession> | undefined;
  isExternalEditPending?: boolean;
  isLocked?: boolean;
  isTagCreatePending?: boolean;
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
    isTagCreatePending: overrides?.isTagCreatePending ?? false,
    visibility: "active" as const,
  };
}

function createCommands(): WorkspaceCommands {
  return {
    archiveBlock: vi.fn(async () => undefined),
    assignBlockTags: vi.fn(async () => createRendererBlock()),
    cancelExternalEdit: vi.fn(async () => undefined),
    createBlockWithFocus: vi.fn(async () => undefined),
    createTag: vi.fn(async () => ({
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "tag-2",
      name: "Tag 2",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
    deleteBlock: vi.fn(async () => undefined),
    deleteTag: vi.fn(async () => undefined),
    focusBlock: vi.fn(),
    reorderBlock: vi.fn(async () => createRendererBlock()),
    restoreBlock: vi.fn(async () => undefined),
    setBlockKeepState: vi.fn(async () => createRendererBlock()),
    setBlockPinnedState: vi.fn(async () => createRendererBlock()),
    submitExternalEdit: vi.fn(async () => undefined),
  };
}

function renderWorkspaceBlockActions(
  options: {
    block?: ReturnType<typeof createRendererBlock>;
    commands?: WorkspaceCommands;
    getEditor?: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
    state?: ReturnType<typeof createState>;
  } = {},
) {
  const actionsRef: { current: WorkspaceBlockActions | null } = { current: null };
  const commands = options.commands ?? createCommands();
  const block = options.block ?? createRendererBlock();
  const state = options.state ?? createState();
  const getEditor = options.getEditor ?? vi.fn();

  function Probe() {
    const nextActions = useWorkspaceBlockActions({
      block,
      commands,
      getEditor,
      state,
    });

    useLayoutEffect(() => {
      actionsRef.current = nextActions;
    }, [nextActions]);

    return null;
  }

  renderWithProviders(<Probe />);

  if (!actionsRef.current) {
    throw new Error("Workspace Block actions were not captured.");
  }

  return { actions: actionsRef.current, commands };
}

describe("useWorkspaceBlockActions", () => {
  it("archives Active Blocks and restores Archived Blocks", async () => {
    const active = renderWorkspaceBlockActions();

    await active.actions.toggleArchive();

    expect(active.commands.archiveBlock).toHaveBeenCalledWith("block-1");
    expect(active.commands.restoreBlock).not.toHaveBeenCalled();

    const archived = renderWorkspaceBlockActions({
      block: createRendererBlock({ archivedAt: "2026-01-02T00:00:00.000Z" }),
    });

    await archived.actions.toggleArchive();

    expect(archived.commands.restoreBlock).toHaveBeenCalledWith("block-1");
    expect(archived.commands.archiveBlock).not.toHaveBeenCalled();
  });

  it("deletes a Block unless an External Edit Session must be cancelled", async () => {
    const regular = renderWorkspaceBlockActions();

    await regular.actions.deleteOrCancelExternalEdit();

    expect(regular.commands.deleteBlock).toHaveBeenCalledWith("block-1");
    expect(regular.commands.cancelExternalEdit).not.toHaveBeenCalled();

    const externalEdit = renderWorkspaceBlockActions({
      state: createState({ externalEditSession: createExternalEditSession() }),
    });

    await externalEdit.actions.deleteOrCancelExternalEdit();

    expect(externalEdit.commands.cancelExternalEdit).toHaveBeenCalledWith("edit-1");
    expect(externalEdit.commands.deleteBlock).not.toHaveBeenCalled();
  });

  it("protects Pinned Blocks and External Edit Sessions from Keep and Archive actions", async () => {
    const pinned = renderWorkspaceBlockActions({
      block: createRendererBlock({ isPinned: true }),
    });

    await pinned.actions.toggleKeep();

    expect(pinned.commands.setBlockKeepState).not.toHaveBeenCalled();

    const externalEdit = renderWorkspaceBlockActions({
      state: createState({ externalEditSession: createExternalEditSession() }),
    });

    await externalEdit.actions.toggleKeep();
    await externalEdit.actions.toggleArchive();

    expect(externalEdit.commands.setBlockKeepState).not.toHaveBeenCalled();
    expect(externalEdit.commands.archiveBlock).not.toHaveBeenCalled();
  });

  it("runs Block ordering, pinning, tag, and copy actions through public Workspace commands", async () => {
    const copy = vi.fn(async () => undefined);
    const { actions, commands } = renderWorkspaceBlockActions({
      block: createRendererBlock({ tags: [createRendererTag({ id: "tag-1" })] }),
      getEditor: () => ({
        copy,
        executeAction: vi.fn((action) => ({
          action,
          focus: "editor" as const,
          status: "executed" as const,
        })),
        flush: vi.fn(async () => ""),
        focus: vi.fn(),
        getActionState: () => DEFAULT_BLOCK_EDITOR_ACTION_STATE,
        getPreviewData: vi.fn(async () => ""),
        subscribeActionState: () => () => undefined,
        subscribePreviewChange: () => () => undefined,
      }),
    });

    await actions.togglePinned();
    await actions.reorder("move-to-top");
    await actions.createTag("Tag 2");
    await actions.copy();

    expect(commands.setBlockPinnedState).toHaveBeenCalledWith("block-1", true);
    expect(commands.reorderBlock).toHaveBeenCalledWith("block-1", "move-to-top");
    expect(commands.createTag).toHaveBeenCalledWith("Tag 2");
    expect(commands.assignBlockTags).toHaveBeenCalledWith("block-1", ["tag-1", "tag-2"]);
    expect(copy).toHaveBeenCalledOnce();
  });

  it("guards Block mutations while the Workspace Block is locked", async () => {
    const { actions, commands } = renderWorkspaceBlockActions({
      state: createState({ isLocked: true }),
    });

    await actions.toggleKeep();
    await actions.toggleArchive();
    await actions.deleteOrCancelExternalEdit();

    expect(commands.setBlockKeepState).not.toHaveBeenCalled();
    expect(commands.archiveBlock).not.toHaveBeenCalled();
    expect(commands.deleteBlock).not.toHaveBeenCalled();
  });
});
