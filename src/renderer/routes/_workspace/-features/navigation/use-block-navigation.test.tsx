// @vitest-environment jsdom

import type { Block, LocateBlockResult } from "@renderer/clients";
import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { EditorRegistry } from "../editing/use-editor-registry";
import { type BlockScrollTarget, useBlockNavigation } from "./use-block-navigation";

function createBlock(id: string): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    isKept: false,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
  };
}

interface NavigationSnapshot {
  activeBlockId: string | null;
  navigateToBlock: ReturnType<typeof useBlockNavigation>["navigateToBlock"];
  navigateToIndex: ReturnType<typeof useBlockNavigation>["navigateToIndex"];
  scrollTarget: BlockScrollTarget | null;
  targetRendered: ReturnType<typeof useBlockNavigation>["targetRendered"];
}

interface NavigationHarnessProps {
  ensureBlockIndexLoaded: (
    index: number,
    options?: { refresh?: boolean },
  ) => Promise<Block | undefined>;
  getBlockAtIndex: (index: number) => Block | undefined;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  onSnapshot: (snapshot: NavigationSnapshot) => void;
  registry: EditorRegistry;
}

function NavigationHarness({
  ensureBlockIndexLoaded,
  getBlockAtIndex,
  locateBlockInView,
  onSnapshot,
  registry,
}: NavigationHarnessProps) {
  const navigation = useBlockNavigation({
    ensureBlockIndexLoaded,
    getBlockAtIndex,
    locateBlockInView,
    registry,
    selectedTagIds: [],
    setSelectedTagIds: vi.fn(),
    setVisibility: vi.fn(),
    visibility: "active",
  });

  useLayoutEffect(() => {
    onSnapshot(navigation);
  });

  return null;
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function createHarness(options: {
  ensureBlockIndexLoaded: NavigationHarnessProps["ensureBlockIndexLoaded"];
  getBlockAtIndex: NavigationHarnessProps["getBlockAtIndex"];
  locateBlockInView: NavigationHarnessProps["locateBlockInView"];
  registry: EditorRegistry;
}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: NavigationSnapshot | null = null;

  act(() => {
    root.render(
      <NavigationHarness
        ensureBlockIndexLoaded={options.ensureBlockIndexLoaded}
        getBlockAtIndex={options.getBlockAtIndex}
        locateBlockInView={options.locateBlockInView}
        onSnapshot={(nextSnapshot) => {
          snapshot = nextSnapshot;
        }}
        registry={options.registry}
      />,
    );
  });

  return {
    getSnapshot(): NavigationSnapshot {
      if (!snapshot) {
        throw new Error("Navigation snapshot is unavailable.");
      }
      return snapshot;
    },
    unmount(): void {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useBlockNavigation", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
  });

  it("refreshes the located page before focusing an externally created block", async () => {
    const targetBlock = createBlock("new-block");
    const staleBlock = createBlock("stale-block");
    let renderedBlock = staleBlock;
    const registry = {
      getEditor: vi.fn(),
      registerEditor: vi.fn(() => () => undefined),
      requestEditorFocus: vi.fn(),
    } satisfies EditorRegistry;
    const ensureBlockIndexLoaded = vi.fn(
      async (_index: number, options?: { refresh?: boolean }) => {
        if (options?.refresh) {
          renderedBlock = targetBlock;
          return targetBlock;
        }
        return staleBlock;
      },
    );
    const harness = createHarness({
      ensureBlockIndexLoaded,
      getBlockAtIndex: () => renderedBlock,
      locateBlockInView: vi.fn(async () => ({ block: targetBlock, index: 0 })),
      registry,
    });
    mountedRoot = harness;

    act(() => {
      harness.getSnapshot().navigateToBlock(targetBlock.id);
    });
    await flushEffects();
    await flushEffects();

    expect(ensureBlockIndexLoaded).toHaveBeenCalledWith(0, { refresh: true });
    expect(harness.getSnapshot().scrollTarget).toMatchObject({ index: 0 });

    act(() => {
      const scrollTarget = harness.getSnapshot().scrollTarget;
      if (!scrollTarget) {
        throw new Error("Expected a scroll target.");
      }
      harness.getSnapshot().targetRendered({
        blockId: renderedBlock.id,
        index: 0,
        requestId: scrollTarget.requestId,
      });
    });
    await flushEffects();

    expect(registry.requestEditorFocus).toHaveBeenCalledWith(targetBlock.id, expect.any(Number));
    expect(harness.getSnapshot().activeBlockId).toBe(targetBlock.id);
  });

  it("focuses the refreshed row for index navigation after list mutations", async () => {
    const staleBlock = createBlock("archived-block");
    const nextBlock = createBlock("next-block");
    let renderedBlock = staleBlock;
    const registry = {
      getEditor: vi.fn(),
      registerEditor: vi.fn(() => () => undefined),
      requestEditorFocus: vi.fn(),
    } satisfies EditorRegistry;
    const ensureBlockIndexLoaded = vi.fn(async () => {
      renderedBlock = nextBlock;
      return nextBlock;
    });
    const harness = createHarness({
      ensureBlockIndexLoaded,
      getBlockAtIndex: () => renderedBlock,
      locateBlockInView: vi.fn(),
      registry,
    });
    mountedRoot = harness;

    act(() => {
      harness.getSnapshot().navigateToIndex(0);
    });
    await flushEffects();
    await flushEffects();

    expect(ensureBlockIndexLoaded).toHaveBeenCalledWith(0, { refresh: false });
    expect(harness.getSnapshot().scrollTarget).toMatchObject({ index: 0 });

    act(() => {
      const scrollTarget = harness.getSnapshot().scrollTarget;
      if (!scrollTarget) {
        throw new Error("Expected a scroll target.");
      }
      harness.getSnapshot().targetRendered({
        blockId: nextBlock.id,
        index: 0,
        requestId: scrollTarget.requestId,
      });
    });
    await flushEffects();

    expect(registry.requestEditorFocus).toHaveBeenCalledWith(nextBlock.id, expect.any(Number));
    expect(harness.getSnapshot().activeBlockId).toBe(nextBlock.id);
  });
});
