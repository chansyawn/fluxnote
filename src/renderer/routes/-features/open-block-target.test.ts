import type { Block, LocateBlockResult } from "@renderer/clients";
import { resolveLocatedBlock } from "@renderer/routes/-features/open-block-target";
import { describe, expect, it, vi } from "vite-plus/test";

function makeBlock(id: string): Block {
  return {
    id,
    position: 0,
    content: "",
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    willArchive: false,
    tags: [],
  };
}

describe("locateBlock", () => {
  it("returns the located index when the backend finds the requested block", async () => {
    const locate = vi.fn<() => Promise<LocateBlockResult>>().mockResolvedValue({
      block: makeBlock("block-1"),
      index: 3,
    });

    await expect(resolveLocatedBlock("block-1", locate)).resolves.toEqual({
      status: "found",
      blockId: "block-1",
      index: 3,
    });
    expect(locate).toHaveBeenCalledOnce();
  });

  it("returns 'not_found' when the backend cannot locate the block", async () => {
    const locate = vi.fn<() => Promise<LocateBlockResult>>().mockResolvedValue(null);

    await expect(resolveLocatedBlock("block-1", locate)).resolves.toEqual({ status: "not_found" });
  });

  it("returns 'not_found' when the locate result does not match the requested block", async () => {
    const locate = vi.fn<() => Promise<LocateBlockResult>>().mockResolvedValue({
      block: makeBlock("block-2"),
      index: 0,
    });

    await expect(resolveLocatedBlock("block-1", locate)).resolves.toEqual({ status: "not_found" });
  });
});
