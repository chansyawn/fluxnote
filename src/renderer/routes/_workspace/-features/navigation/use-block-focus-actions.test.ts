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
      reorderBlock: vi.fn(async () => activeBlock),
      setBlockPinnedState: vi.fn(async () => activeBlock),
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
      reorderBlock: vi.fn(async () => archivedBlock),
      setBlockPinnedState: vi.fn(async () => archivedBlock),
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

  it("reorders a block and restores focus to the same editor", async () => {
    const reorderedBlock = createBlock({ orderIndex: 1 });
    const reorderBlock = vi.fn(async () => reorderedBlock);
    const navigateToBlock = vi.fn(async () => undefined);

    const actions = useBlockFocusActions({
      activeBlockId: "block-1",
      archiveBlock: vi.fn(async () => createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" })),
      restoreBlock: vi.fn(async () => createBlock()),
      totalBlockCount: 2,
      createBlock: vi.fn(async () => createBlock({ id: "new-block" })),
      deleteBlock: vi.fn(async () => undefined),
      reorderBlock,
      setBlockPinnedState: vi.fn(async () => reorderedBlock),
      ensureBlockIndexLoaded: vi.fn(async () => createBlock({ id: "block-2" })),
      navigateToBlock,
      locateBlockInView: vi.fn(async () => ({ block: reorderedBlock, index: 0 })),
      setActiveBlockId: vi.fn(),
    });

    const result = await actions.reorderBlockWithFocus("block-1", "move-down");

    expect(reorderBlock).toHaveBeenCalledWith("block-1", "move-down");
    expect(navigateToBlock).toHaveBeenCalledWith("block-1", { align: "auto" });
    expect(result).toBe(reorderedBlock);
  });

  it("pins a block and restores focus to the same editor", async () => {
    const pinnedBlock = createBlock({ isPinned: true, orderIndex: -1 });
    const setBlockPinnedState = vi.fn(async () => pinnedBlock);
    const navigateToBlock = vi.fn(async () => undefined);

    const actions = useBlockFocusActions({
      activeBlockId: "block-1",
      archiveBlock: vi.fn(async () => createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" })),
      restoreBlock: vi.fn(async () => createBlock()),
      totalBlockCount: 2,
      createBlock: vi.fn(async () => createBlock({ id: "new-block" })),
      deleteBlock: vi.fn(async () => undefined),
      reorderBlock: vi.fn(async () => createBlock()),
      setBlockPinnedState,
      ensureBlockIndexLoaded: vi.fn(async () => createBlock({ id: "block-2" })),
      navigateToBlock,
      locateBlockInView: vi.fn(async () => ({ block: pinnedBlock, index: 0 })),
      setActiveBlockId: vi.fn(),
    });

    const result = await actions.setBlockPinnedStateWithFocus("block-1", true);

    expect(setBlockPinnedState).toHaveBeenCalledWith("block-1", true);
    expect(navigateToBlock).toHaveBeenCalledWith("block-1", { align: "auto" });
    expect(result).toBe(pinnedBlock);
  });
});
