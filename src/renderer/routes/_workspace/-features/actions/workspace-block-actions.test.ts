import type { Block, ExternalEditSession } from "@renderer/clients";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("react", () => ({
  useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  useMemo: <T>(factory: () => T) => factory(),
}));

import { useWorkspaceBlockActions } from "./workspace-block-actions";

function createBlock(overrides?: Partial<Block>): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "block-1",
    isKept: false,
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
    ...overrides,
  };
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

function createState(overrides?: {
  externalEditSession?: ExternalEditSession | undefined;
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

function createCommands() {
  return {
    archiveBlock: vi.fn(async () => undefined),
    assignBlockTags: vi.fn(async () => createBlock()),
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
    reorderBlock: vi.fn(async () => createBlock()),
    restoreBlock: vi.fn(async () => undefined),
    setBlockKeepState: vi.fn(async () => createBlock()),
    setBlockPinnedState: vi.fn(async () => createBlock()),
    submitExternalEdit: vi.fn(async () => undefined),
  };
}

describe("useWorkspaceBlockActions", () => {
  it("toggles active block into archive", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState(),
    });

    await actions.toggleArchive();

    expect(commands.archiveBlock).toHaveBeenCalledWith("block-1");
    expect(commands.restoreBlock).not.toHaveBeenCalled();
  });

  it("toggles archived block into active", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" }),
      commands,
      getEditor: vi.fn(),
      state: createState(),
    });

    await actions.toggleArchive();

    expect(commands.restoreBlock).toHaveBeenCalledWith("block-1");
    expect(commands.archiveBlock).not.toHaveBeenCalled();
  });

  it("cancels external edit instead of deleting block", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState({ externalEditSession }),
    });

    await actions.deleteOrCancelExternalEdit();

    expect(commands.cancelExternalEdit).toHaveBeenCalledWith("edit-1");
    expect(commands.deleteBlock).not.toHaveBeenCalled();
  });

  it("deletes block without external edit session", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState(),
    });

    await actions.deleteOrCancelExternalEdit();

    expect(commands.deleteBlock).toHaveBeenCalledWith("block-1");
    expect(commands.cancelExternalEdit).not.toHaveBeenCalled();
  });

  it("toggles active block pin state", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState(),
    });

    await actions.togglePinned();

    expect(commands.setBlockPinnedState).toHaveBeenCalledWith("block-1", true);
  });

  it("does not toggle keep for pinned blocks", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock({ isPinned: true }),
      commands,
      getEditor: vi.fn(),
      state: createState(),
    });

    await actions.toggleKeep();

    expect(commands.setBlockKeepState).not.toHaveBeenCalled();
  });

  it("does not toggle keep or archive for external edit blocks", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState({ externalEditSession }),
    });

    await actions.toggleKeep();
    await actions.toggleArchive();

    expect(commands.setBlockKeepState).not.toHaveBeenCalled();
    expect(commands.archiveBlock).not.toHaveBeenCalled();
  });

  it("reorders active block", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState(),
    });

    await actions.reorder("move-to-top");

    expect(commands.reorderBlock).toHaveBeenCalledWith("block-1", "move-to-top");
  });

  it("guards locked block mutations", async () => {
    const commands = createCommands();
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(),
      state: createState({ isLocked: true }),
    });

    await actions.toggleKeep();
    await actions.toggleArchive();
    await actions.deleteOrCancelExternalEdit();

    expect(commands.setBlockKeepState).not.toHaveBeenCalled();
    expect(commands.archiveBlock).not.toHaveBeenCalled();
    expect(commands.deleteBlock).not.toHaveBeenCalled();
  });

  it("awaits copy before resolving", async () => {
    const commands = createCommands();
    const copy = vi.fn(async () => undefined);
    const actions = useWorkspaceBlockActions({
      block: createBlock(),
      commands,
      getEditor: vi.fn(() => ({ copy, flush: vi.fn(async () => ""), focus: vi.fn() })),
      state: createState(),
    });

    await actions.copy();

    expect(copy).toHaveBeenCalledOnce();
  });
});
