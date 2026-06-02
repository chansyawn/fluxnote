import { DEFAULT_USER_PREFERENCES } from "@shared/features/preferences/user-preferences";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  archiveBlock: vi.fn(),
  createBlockRecord: vi.fn(),
  deleteArchivedBlocks: vi.fn(),
  deleteBlock: vi.fn(),
  listBlocks: vi.fn(),
  locateBlock: vi.fn(),
  reorderBlock: vi.fn(),
  restoreBlock: vi.fn(),
  setBlockKeepState: vi.fn(),
  setBlockPinnedState: vi.fn(),
  updateBlockContent: vi.fn(),
}));

vi.mock("./service", () => mocks);

import { registerBlocksCommands } from "./command";

describe("blocks command", () => {
  const handlers = new Map<string, (input: unknown) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: unknown) => unknown) =>
      handlers.set(name, handler),
    ),
  };
  const deps = {
    db: {} as never,
    getAssetPathForBlock: (blockId: string) => `/tmp/${blockId}`,
    listExternalEditSessions: () => [],
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    readUserPreferences: () => ({
      ...DEFAULT_USER_PREFERENCES,
      autoArchive: { enabled: true, idleMinutes: 60 },
    }),
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it("registers and dispatches create command", async () => {
    mocks.createBlockRecord.mockResolvedValue({ id: "b1" });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.create")?.({});

    expect(mocks.createBlockRecord).toHaveBeenCalledWith(deps.db);
    expect(result).toEqual({ id: "b1" });
  });

  it("dispatches delete command with asset path", async () => {
    mocks.deleteBlock.mockResolvedValue({ deletedBlockId: "b1" });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.delete")?.({ blockId: "b1" });

    expect(mocks.deleteBlock).toHaveBeenCalledWith(deps.db, "b1", "/tmp/b1");
    expect(result).toEqual({ deletedBlockId: "b1" });
  });

  it("dispatches archive command with external edit protection context", async () => {
    mocks.archiveBlock.mockResolvedValue({ id: "b1" });
    const depsWithExternalEdit = {
      ...deps,
      listExternalEditSessions: () => [
        {
          blockId: "b1",
          createdAt: "2026-01-01T00:00:00.000Z",
          editId: "edit-1",
          trigger: {
            cwd: "/tmp",
            requestedFilePath: "/tmp/requested.md",
            source: "cli" as const,
            targetFilePath: "/tmp/target.md",
          },
        },
      ],
    };
    registerBlocksCommands(ipc as never, depsWithExternalEdit);

    const result = await handlers.get("blocks.archive")?.({ blockId: "b1" });

    expect(mocks.archiveBlock).toHaveBeenCalledWith(
      deps.db,
      "b1",
      expect.objectContaining({ protectedBlockIds: new Set(["b1"]) }),
    );
    expect(result).toEqual({ id: "b1" });
  });

  it("dispatches delete archived command", async () => {
    mocks.deleteArchivedBlocks.mockResolvedValue({ deletedCount: 2 });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.delete-archived")?.(undefined);

    expect(mocks.deleteArchivedBlocks).toHaveBeenCalledWith(deps.db, deps.getAssetPathForBlock);
    expect(result).toEqual({ deletedCount: 2 });
  });

  it("dispatches list command with default visibility", async () => {
    mocks.listBlocks.mockResolvedValue({ blocks: [], limit: 20, offset: 0, totalCount: 0 });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.list")?.({ limit: 20, offset: 0, tagIds: undefined });

    expect(mocks.listBlocks).toHaveBeenCalledWith(
      deps.db,
      undefined,
      "active",
      0,
      20,
      expect.objectContaining({ cutoffIso: expect.any(String) }),
    );
    expect(result).toEqual({ blocks: [], limit: 20, offset: 0, totalCount: 0 });
  });

  it("dispatches locate command with explicit visibility", async () => {
    mocks.locateBlock.mockResolvedValue({ block: { id: "b1" }, index: 3 });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.locate")?.({
      blockId: "b1",
      tagIds: ["t1"],
      visibility: "archived",
    });

    expect(mocks.locateBlock).toHaveBeenCalledWith(
      deps.db,
      "b1",
      ["t1"],
      "archived",
      expect.objectContaining({ cutoffIso: expect.any(String) }),
    );
    expect(result).toEqual({ block: { id: "b1" }, index: 3 });
  });

  it("dispatches keep state command", async () => {
    mocks.setBlockKeepState.mockResolvedValue({ id: "b1", isKept: true });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.set-keep-state")?.({ blockId: "b1", isKept: true });

    expect(mocks.setBlockKeepState).toHaveBeenCalledWith(
      deps.db,
      "b1",
      true,
      expect.objectContaining({ cutoffIso: expect.any(String) }),
    );
    expect(result).toEqual({ id: "b1", isKept: true });
  });

  it("dispatches reorder command", async () => {
    mocks.reorderBlock.mockResolvedValue({ block: { id: "b1" }, changed: true });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.reorder")?.({
      blockId: "b1",
      operation: "move-to-top",
      tagIds: ["t1"],
    });

    expect(mocks.reorderBlock).toHaveBeenCalledWith(
      deps.db,
      "b1",
      "move-to-top",
      ["t1"],
      expect.objectContaining({ cutoffIso: expect.any(String) }),
    );
    expect(result).toEqual({ block: { id: "b1" }, changed: true });
  });

  it("dispatches pinned state command", async () => {
    mocks.setBlockPinnedState.mockResolvedValue({ id: "b1", isPinned: true });
    registerBlocksCommands(ipc as never, deps);

    const result = await handlers.get("blocks.set-pinned-state")?.({
      blockId: "b1",
      isPinned: true,
    });

    expect(mocks.setBlockPinnedState).toHaveBeenCalledWith(
      deps.db,
      "b1",
      true,
      expect.objectContaining({ cutoffIso: expect.any(String) }),
    );
    expect(result).toEqual({ id: "b1", isPinned: true });
  });
});
