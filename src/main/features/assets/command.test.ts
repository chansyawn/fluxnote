import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  copyAsset: vi.fn(),
  createAsset: vi.fn(),
  resolveAsset: vi.fn(),
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
    paths: { assetPathForBlock: (blockId: string) => `/tmp/${blockId}` },
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it("dispatches assets commands", async () => {
    mocks.createAsset.mockResolvedValue({ assets: [{ assetUrl: "assets://a/b.png" }] });
    mocks.copyAsset.mockResolvedValue({
      assets: [{ assetUrl: "assets://c/d.png", sourceAssetUrl: "assets://b1/a.png" }],
    });
    mocks.resolveAsset.mockResolvedValue({
      assets: [{ assetUrl: "assets://b1/a.png", fileUrl: "file:///tmp/b1/a.png" }],
    });
    registerAssetsCommands(ipc as never, deps as never);

    const createResult = await handlers.get("assets.create")?.({ assets: [], blockId: "b1" });
    const copyResult = await handlers.get("assets.copy")?.({
      assetUrls: ["assets://b1/a.png"],
      sourceBlockId: "b1",
      targetBlockId: "b2",
    });
    const resolveResult = await handlers.get("assets.resolve")?.({
      assetUrls: ["assets://b1/a.png"],
    });

    expect(mocks.createAsset).toHaveBeenCalled();
    expect(mocks.copyAsset).toHaveBeenCalled();
    expect(mocks.resolveAsset).toHaveBeenCalled();
    expect(createResult).toEqual({ assets: [{ assetUrl: "assets://a/b.png" }] });
    expect(copyResult).toEqual({
      assets: [{ assetUrl: "assets://c/d.png", sourceAssetUrl: "assets://b1/a.png" }],
    });
    expect(resolveResult).toEqual({
      assets: [{ assetUrl: "assets://b1/a.png", fileUrl: "file:///tmp/b1/a.png" }],
    });
  });
});
