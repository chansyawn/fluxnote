import type { Block } from "@renderer/clients";
import { locateBlock } from "@renderer/routes/-features/open-block-target";
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
  it("returns 'found' when the block exists in the fetched list", async () => {
    const fetchBlocks = vi.fn().mockResolvedValue([makeBlock("block-1"), makeBlock("block-2")]);

    await expect(locateBlock("block-1", fetchBlocks)).resolves.toBe("found");
    expect(fetchBlocks).toHaveBeenCalledOnce();
  });

  it("returns 'not_found' when the block is absent from the fetched list", async () => {
    const fetchBlocks = vi.fn().mockResolvedValue([makeBlock("block-2")]);

    await expect(locateBlock("block-1", fetchBlocks)).resolves.toBe("not_found");
  });

  it("returns 'not_found' when the fetched list is empty", async () => {
    const fetchBlocks = vi.fn().mockResolvedValue([]);

    await expect(locateBlock("block-1", fetchBlocks)).resolves.toBe("not_found");
  });
});
