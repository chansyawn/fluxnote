// @vitest-environment jsdom

import type { Block, BlockVisibility, LocateBlockResult } from "@renderer/clients";
import { act, useCallback, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { EditorRegistry } from "../editing/use-editor-registry";
import {
  BlockNavigationCancelledError,
  type BlockScrollTarget,
  useBlockNavigation,
} from "./use-block-navigation";

function createBlock(id: string, overrides?: Partial<Block>): Block {
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
    ...overrides,
  };
}

interface NavigationSnapshot {
  activeBlockId: string | null;
  navigateToBlock: ReturnType<typeof useBlockNavigation>["navigateToBlock"];
  scrollTarget: BlockScrollTarget | null;
  selectedTagIds: string[];
  targetRendered: ReturnType<typeof useBlockNavigation>["targetRendered"];
  visibility: BlockVisibility;
}

interface LocateView {
  selectedTagIds: string[];
  visibility: BlockVisibility;
}

interface NavigationHarnessProps {
  ensureBlockIndexLoaded: (
    index: number,
    options?: { refresh?: boolean },
  ) => Promise<Block | undefined>;
  getBlockAtIndex: (index: number) => Block | undefined;
  initialSelectedTagIds?: string[];
  initialVisibility?: BlockVisibility;
  locateBlockInView: (blockId: string, view: LocateView) => Promise<LocateBlockResult>;
  onSnapshot: (snapshot: NavigationSnapshot) => void;
  registry: EditorRegistry;
}

function NavigationHarness({
  ensureBlockIndexLoaded,
  getBlockAtIndex,
  initialSelectedTagIds = [],
  initialVisibility = "active",
  locateBlockInView,
  onSnapshot,
  registry,
}: NavigationHarnessProps) {
  const [visibility, setVisibility] = useState<BlockVisibility>(initialVisibility);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialSelectedTagIds);
  const locateCurrentView = useCallback(
    (blockId: string) => locateBlockInView(blockId, { selectedTagIds, visibility }),
    [locateBlockInView, selectedTagIds, visibility],
  );
  const navigation = useBlockNavigation({
    blockCollection: {
      ensureBlockIndexLoaded,
      getBlockAtIndex,
      locateBlockInView: locateCurrentView,
    },
    registry,
    workspaceView: {
      isUnfiltered: (nextVisibility) =>
        visibility === nextVisibility && selectedTagIds.length === 0,
      showUnfiltered: (nextVisibility) => {
        if (visibility !== nextVisibility) {
          setVisibility(nextVisibility);
        }
        if (selectedTagIds.length > 0) {
          setSelectedTagIds([]);
        }
      },
      visibility,
    },
  });

  useLayoutEffect(() => {
    onSnapshot({ ...navigation, selectedTagIds, visibility });
  });

  return null;
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function createRegistry(): EditorRegistry {
  return {
    getEditor: vi.fn(),
    registerEditor: vi.fn(() => () => undefined),
    requestEditorFocus: vi.fn(),
  };
}

function createHarness(options: {
  ensureBlockIndexLoaded: NavigationHarnessProps["ensureBlockIndexLoaded"];
  getBlockAtIndex: NavigationHarnessProps["getBlockAtIndex"];
  initialSelectedTagIds?: string[];
  initialVisibility?: BlockVisibility;
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
        initialSelectedTagIds={options.initialSelectedTagIds}
        initialVisibility={options.initialVisibility}
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

async function renderScrollTarget(harness: ReturnType<typeof createHarness>, blockId: string) {
  await flushEffects();
  const scrollTarget = harness.getSnapshot().scrollTarget;
  if (!scrollTarget) {
    throw new Error("Expected a scroll target.");
  }

  act(() => {
    harness.getSnapshot().targetRendered(blockId);
  });
  await flushEffects();
}

describe("useBlockNavigation", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
  });

  it("refreshes the located page before focusing a block", async () => {
    const targetBlock = createBlock("new-block");
    const staleBlock = createBlock("stale-block");
    let renderedBlock = staleBlock;
    const registry = createRegistry();
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

    let navigationPromise!: Promise<void>;
    act(() => {
      navigationPromise = harness.getSnapshot().navigateToBlock(targetBlock.id);
    });
    await flushEffects();
    await flushEffects();

    expect(ensureBlockIndexLoaded).toHaveBeenCalledWith(0, { refresh: true });
    expect(harness.getSnapshot().scrollTarget).toMatchObject({ index: 0 });

    await renderScrollTarget(harness, renderedBlock.id);

    await expect(navigationPromise).resolves.toBeUndefined();
    expect(registry.requestEditorFocus).toHaveBeenCalledWith(targetBlock.id, expect.any(Number));
    expect(harness.getSnapshot().activeBlockId).toBe(targetBlock.id);
  });

  it("switches to archived blocks when the target is archived", async () => {
    const archivedBlock = createBlock("archived-block", {
      archivedAt: "2026-01-02T00:00:00.000Z",
    });
    const registry = createRegistry();
    const locateBlockInView = vi.fn(async (_blockId: string, view: LocateView) => {
      if (view.visibility === "archived") {
        return { block: archivedBlock, index: 0 };
      }
      return null;
    });
    const harness = createHarness({
      ensureBlockIndexLoaded: vi.fn(async () => archivedBlock),
      getBlockAtIndex: () => archivedBlock,
      locateBlockInView,
      registry,
    });
    mountedRoot = harness;

    let navigationPromise!: Promise<void>;
    act(() => {
      navigationPromise = harness.getSnapshot().navigateToBlock(archivedBlock.id);
    });
    await flushEffects();
    await flushEffects();
    await flushEffects();

    expect(harness.getSnapshot().visibility).toBe("archived");
    expect(harness.getSnapshot().selectedTagIds).toEqual([]);

    await renderScrollTarget(harness, archivedBlock.id);

    await expect(navigationPromise).resolves.toBeUndefined();
    expect(registry.requestEditorFocus).toHaveBeenCalledWith(archivedBlock.id, expect.any(Number));
  });

  it("rejects a superseded navigation request", async () => {
    const targetBlock = createBlock("block-2");
    const registry = createRegistry();
    const harness = createHarness({
      ensureBlockIndexLoaded: vi.fn(async () => targetBlock),
      getBlockAtIndex: () => targetBlock,
      locateBlockInView: vi.fn(async () => ({ block: targetBlock, index: 0 })),
      registry,
    });
    mountedRoot = harness;

    let firstNavigation!: Promise<void>;
    let secondNavigation!: Promise<void>;
    act(() => {
      firstNavigation = harness.getSnapshot().navigateToBlock("block-1");
      secondNavigation = harness.getSnapshot().navigateToBlock("block-2");
    });
    void secondNavigation.catch(() => undefined);

    await expect(firstNavigation).rejects.toBeInstanceOf(BlockNavigationCancelledError);
  });
});
