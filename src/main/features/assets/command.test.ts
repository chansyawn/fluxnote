import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  copyAsset: vi.fn(),
  createAsset: vi.fn(),
}));

vi.mock("./service", () => mocks);

import { registerAssetsCommands } from "./command";

describe("assets command", () => {
  const handlers = new Map<string, (input: any) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: any) => unknown) => handlers.set(name, handler)),
  };
  const deps = {
    db: {} as never,
    persistence: { paths: { getAssetPathForBlock: (blockId: string) => `/tmp/${blockId}` } },
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it("dispatches create and copy commands", async () => {
    mocks.createAsset.mockResolvedValue({ assetUrl: "assets://a/b.png" });
    mocks.copyAsset.mockResolvedValue({ assetUrl: "assets://c/d.png" });
    registerAssetsCommands(ipc as never, deps as never);

    const createResult = await handlers.get("assets.create")?.({ blockId: "b1" });
    const copyResult = await handlers.get("assets.copy")?.({
      sourceBlockId: "b1",
      targetBlockId: "b2",
      assetUrl: "assets://b1/a.png",
    });

    expect(mocks.createAsset).toHaveBeenCalled();
    expect(mocks.copyAsset).toHaveBeenCalled();
    expect(createResult).toEqual({ assetUrl: "assets://a/b.png" });
    expect(copyResult).toEqual({ assetUrl: "assets://c/d.png" });
  });
});
