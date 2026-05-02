import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveBlock: vi.fn(),
  createBlockRecord: vi.fn(),
  deleteBlock: vi.fn(),
  listBlocks: vi.fn(),
  locateBlock: vi.fn(),
  restoreBlock: vi.fn(),
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
    readAutoArchiveSettings: () => ({ enabled: true, idleMinutes: 60 }),
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
});
