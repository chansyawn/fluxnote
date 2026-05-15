import type { Block } from "@renderer/clients";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("react", () => ({
  useEffectEvent: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { useBlockFocusActions } from "./use-block-focus-actions";

function createBlock(overrides?: Partial<Block>): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "block-1",
    isKept: false,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
    ...overrides,
  };
}

describe("useBlockFocusActions", () => {
  it("toggles an active block into archive", async () => {
    const activeBlock = createBlock();
    const archiveBlock = vi.fn(async () => createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" }));
    const restoreBlock = vi.fn(async () => activeBlock);

    const actions = useBlockFocusActions({
      activeBlockId: "block-1",
      archiveBlock,
      restoreBlock,
      totalBlockCount: 2,
      createBlock: vi.fn(async () => createBlock({ id: "new-block" })),
      deleteBlock: vi.fn(async () => undefined),
      navigateToBlock: vi.fn(),
      navigateToIndex: vi.fn(),
      locateBlockInView: vi.fn(async () => ({ block: activeBlock, index: 0 })),
      setActiveBlockId: vi.fn(),
      setBlockKeepState: vi.fn(async () => activeBlock),
    });

    await actions.toggleArchiveBlockWithFocus("block-1");

    expect(archiveBlock).toHaveBeenCalledWith("block-1");
    expect(restoreBlock).not.toHaveBeenCalled();
  });

  it("toggles an archived block into active", async () => {
    const archivedBlock = createBlock({ archivedAt: "2026-01-02T00:00:00.000Z" });
    const archiveBlock = vi.fn(async () => archivedBlock);
    const restoreBlock = vi.fn(async () => createBlock());

    const actions = useBlockFocusActions({
      activeBlockId: "block-1",
      archiveBlock,
      restoreBlock,
      totalBlockCount: 2,
      createBlock: vi.fn(async () => createBlock({ id: "new-block" })),
      deleteBlock: vi.fn(async () => undefined),
      navigateToBlock: vi.fn(),
      navigateToIndex: vi.fn(),
      locateBlockInView: vi.fn(async () => ({ block: archivedBlock, index: 0 })),
      setActiveBlockId: vi.fn(),
      setBlockKeepState: vi.fn(async () => archivedBlock),
    });

    await actions.toggleArchiveBlockWithFocus("block-1");

    expect(restoreBlock).toHaveBeenCalledWith("block-1");
    expect(archiveBlock).not.toHaveBeenCalled();
  });
});
