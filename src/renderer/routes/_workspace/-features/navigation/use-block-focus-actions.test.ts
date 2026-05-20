import type { Block } from "@renderer/clients";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("react", () => ({
  useEffectEvent: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { getNextFocusIndexAfterMutation, useBlockFocusActions } from "./use-block-focus-actions";

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

describe("useBlockFocusActions", () => {
  it("selects the next focus index after a block leaves the view", () => {
    expect(getNextFocusIndexAfterMutation(0, 3)).toBe(0);
    expect(getNextFocusIndexAfterMutation(2, 3)).toBe(1);
    expect(getNextFocusIndexAfterMutation(0, 1)).toBeNull();
  });

  it("archives active block and moves focus", async () => {
    const activeBlock = createBlock();
    const nextBlock = createBlock({ id: "block-2" });
    const archiveBlock = vi.fn(async () => createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" }));
    const restoreBlock = vi.fn(async () => activeBlock);
    const navigateToBlock = vi.fn(async () => undefined);

    const actions = useBlockFocusActions({
      activeBlockId: "block-1",
      archiveBlock,
      restoreBlock,
      totalBlockCount: 2,
      createBlock: vi.fn(async () => createBlock({ id: "new-block" })),
      deleteBlock: vi.fn(async () => undefined),
      ensureBlockIndexLoaded: vi.fn(async () => nextBlock),
      navigateToBlock,
      locateBlockInView: vi.fn(async () => ({ block: activeBlock, index: 0 })),
      setActiveBlockId: vi.fn(),
    });

    await actions.archiveBlockWithFocus("block-1");

    expect(archiveBlock).toHaveBeenCalledWith("block-1");
    expect(restoreBlock).not.toHaveBeenCalled();
    expect(navigateToBlock).toHaveBeenCalledWith("block-2", { align: "auto" });
  });

  it("restores archived block and moves focus", async () => {
    const archivedBlock = createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" });
    const nextBlock = createBlock({ id: "block-2" });
    const archiveBlock = vi.fn(async () => archivedBlock);
    const restoreBlock = vi.fn(async () => createBlock());
    const navigateToBlock = vi.fn(async () => undefined);

    const actions = useBlockFocusActions({
      activeBlockId: "block-1",
      archiveBlock,
      restoreBlock,
      totalBlockCount: 2,
      createBlock: vi.fn(async () => createBlock({ id: "new-block" })),
      deleteBlock: vi.fn(async () => undefined),
      ensureBlockIndexLoaded: vi.fn(async () => nextBlock),
      navigateToBlock,
      locateBlockInView: vi.fn(async () => ({ block: archivedBlock, index: 0 })),
      setActiveBlockId: vi.fn(),
    });

    await actions.restoreBlockWithFocus("block-1");

    expect(restoreBlock).toHaveBeenCalledWith("block-1");
    expect(archiveBlock).not.toHaveBeenCalled();
    expect(navigateToBlock).toHaveBeenCalledWith("block-2", { align: "auto" });
  });
});
