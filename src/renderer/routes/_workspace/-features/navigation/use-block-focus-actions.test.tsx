// @vitest-environment jsdom

import { createRendererBlock } from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import { useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  captureRendererEvent: vi.fn(),
}));

vi.mock("@renderer/features/telemetry", () => ({
  captureRendererEvent: mocks.captureRendererEvent,
}));

import { getNextFocusIndexAfterMutation, useBlockFocusActions } from "./use-block-focus-actions";
import type {
  UseBlockFocusActionsParams,
  UseBlockFocusActionsResult,
} from "./use-block-focus-actions";

function createParams(
  overrides: Partial<UseBlockFocusActionsParams> = {},
): UseBlockFocusActionsParams {
  const activeBlock = createRendererBlock();

  return {
    activeBlockId: "block-1",
    archiveBlock: vi.fn(async () =>
      createRendererBlock({ archivedAt: "2026-01-02T00:00:00.000Z" }),
    ),
    createBlock: vi.fn(async () => createRendererBlock({ id: "new-block" })),
    deleteBlock: vi.fn(async () => undefined),
    ensureBlockIndexLoaded: vi.fn(async () => createRendererBlock({ id: "block-2" })),
    locateBlockInView: vi.fn(async () => ({ block: activeBlock, index: 0 })),
    navigateToBlock: vi.fn(async () => undefined),
    reorderBlock: vi.fn(async () => activeBlock),
    restoreBlock: vi.fn(async () => activeBlock),
    setActiveBlockId: vi.fn(),
    setBlockPinnedState: vi.fn(async () => activeBlock),
    totalBlockCount: 2,
    ...overrides,
  };
}

function BlockFocusActionsProbe({
  onActions,
  params,
}: {
  onActions: (actions: UseBlockFocusActionsResult) => void;
  params: UseBlockFocusActionsParams;
}) {
  const actions = useBlockFocusActions(params);

  useLayoutEffect(() => {
    onActions(actions);
  }, [actions, onActions]);

  return null;
}

function renderBlockFocusActions(params: UseBlockFocusActionsParams) {
  const actionsRef: { current: UseBlockFocusActionsResult | null } = { current: null };

  renderWithProviders(
    <BlockFocusActionsProbe
      params={params}
      onActions={(nextActions) => {
        actionsRef.current = nextActions;
      }}
    />,
  );

  if (!actionsRef.current) {
    throw new Error("Block focus actions were not captured.");
  }

  return actionsRef.current;
}

describe("useBlockFocusActions", () => {
  it("selects the next focus index after a Block leaves the Workspace view", () => {
    expect(getNextFocusIndexAfterMutation(0, 3)).toBe(0);
    expect(getNextFocusIndexAfterMutation(2, 3)).toBe(1);
    expect(getNextFocusIndexAfterMutation(0, 1)).toBeNull();
  });

  it("archives an Active Block and moves focus to the next visible Block", async () => {
    const nextBlock = createRendererBlock({ id: "block-2" });
    const params = createParams({
      ensureBlockIndexLoaded: vi.fn(async () => nextBlock),
    });
    const actions = renderBlockFocusActions(params);

    await actions.archiveBlockWithFocus("block-1");

    expect(params.archiveBlock).toHaveBeenCalledWith("block-1");
    expect(params.restoreBlock).not.toHaveBeenCalled();
    expect(params.navigateToBlock).toHaveBeenCalledWith("block-2", { align: "auto" });
  });

  it("restores an Archived Block and moves focus to the next visible Block", async () => {
    const archivedBlock = createRendererBlock({ archivedAt: "2026-01-02T00:00:00.000Z" });
    const nextBlock = createRendererBlock({ id: "block-2" });
    const params = createParams({
      ensureBlockIndexLoaded: vi.fn(async () => nextBlock),
      locateBlockInView: vi.fn(async () => ({ block: archivedBlock, index: 0 })),
      restoreBlock: vi.fn(async () => createRendererBlock()),
    });
    const actions = renderBlockFocusActions(params);

    await actions.restoreBlockWithFocus("block-1");

    expect(params.restoreBlock).toHaveBeenCalledWith("block-1");
    expect(params.archiveBlock).not.toHaveBeenCalled();
    expect(params.navigateToBlock).toHaveBeenCalledWith("block-2", { align: "auto" });
  });

  it("restores focus to the same Block after reorder and pin changes", async () => {
    const reorderedBlock = createRendererBlock({ orderIndex: 1 });
    const pinnedBlock = createRendererBlock({ isPinned: true, orderIndex: -1 });
    const params = createParams({
      reorderBlock: vi.fn(async () => reorderedBlock),
      setBlockPinnedState: vi.fn(async () => pinnedBlock),
    });
    const actions = renderBlockFocusActions(params);

    const reorderResult = await actions.reorderBlockWithFocus("block-1", "move-down");
    const pinnedResult = await actions.setBlockPinnedStateWithFocus("block-1", true);

    expect(params.reorderBlock).toHaveBeenCalledWith("block-1", "move-down");
    expect(params.setBlockPinnedState).toHaveBeenCalledWith("block-1", true);
    expect(params.navigateToBlock).toHaveBeenNthCalledWith(1, "block-1", { align: "auto" });
    expect(params.navigateToBlock).toHaveBeenNthCalledWith(2, "block-1", { align: "auto" });
    expect(reorderResult).toBe(reorderedBlock);
    expect(pinnedResult).toBe(pinnedBlock);
  });

  it("clears the Active Block when no next Block remains", async () => {
    const params = createParams({
      locateBlockInView: vi.fn(async () => ({ block: createRendererBlock(), index: 0 })),
      totalBlockCount: 1,
    });
    const actions = renderBlockFocusActions(params);

    await actions.deleteBlockWithFocus("block-1");

    expect(params.deleteBlock).toHaveBeenCalledWith("block-1");
    expect(params.setActiveBlockId).toHaveBeenCalledWith(null);
    expect(params.navigateToBlock).not.toHaveBeenCalled();
  });

  it("creates a Block and focuses it in the Workspace", async () => {
    const newBlock = createRendererBlock({ id: "new-block" });
    const params = createParams({
      createBlock: vi.fn(async () => newBlock),
    });
    const actions = renderBlockFocusActions(params);

    await actions.createBlockWithFocus("workspace_titlebar");

    expect(params.createBlock).toHaveBeenCalledOnce();
    expect(mocks.captureRendererEvent).toHaveBeenCalledWith("block_created", {
      source: "workspace_titlebar",
    });
    expect(params.navigateToBlock).toHaveBeenCalledWith("new-block", undefined);
  });
});
