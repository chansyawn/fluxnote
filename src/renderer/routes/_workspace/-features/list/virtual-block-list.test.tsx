// @vitest-environment jsdom

import type { Block } from "@renderer/clients";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  measureElement: vi.fn(),
  scrollToIndex: vi.fn(),
  virtualIndexes: undefined as number[] | undefined,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@renderer/features/preferences/preferences-query", () => ({
  useFontSizePreference: () => ({
    fontSize: 16,
  }),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (options: { count: number; scrollMargin?: number }) => {
    const indexes =
      mocks.virtualIndexes ?? Array.from({ length: options.count }, (_unused, index) => index);

    return {
      getTotalSize: () => options.count * 140,
      getVirtualItems: () =>
        indexes.map((index) => ({
          index,
          key: index,
          start: index * 140,
        })),
      measureElement: mocks.measureElement,
      options: {
        scrollMargin: options.scrollMargin ?? 0,
      },
      scrollToIndex: mocks.scrollToIndex,
    };
  },
}));

vi.mock("./block-list-row", () => ({
  BlockListRow: ({ block }: { block: Block | undefined }) => (
    <div data-block-row={block?.id ?? "placeholder"} />
  ),
}));

import { VirtualBlockList } from "./virtual-block-list";

function createBlock(id: string, overrides?: Partial<Block>): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    isKept: false,
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
    ...overrides,
  };
}

function renderVirtualBlockList(blocks: Block[]) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const ensureBlockRange = vi.fn();

  act(() => {
    root.render(
      <VirtualBlockList
        totalCount={blocks.length}
        getBlockAtIndex={(index) => blocks[index]}
        ensureBlockRange={ensureBlockRange}
        scrollTarget={null}
        onScrollTargetRendered={vi.fn()}
      />,
    );
  });

  return { container, ensureBlockRange, root };
}

describe("VirtualBlockList", () => {
  let mountedRoot: Root | null = null;
  let mountedContainer: HTMLElement | null = null;

  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot?.unmount();
      });
    }

    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
    mocks.measureElement.mockClear();
    mocks.scrollToIndex.mockClear();
    mocks.virtualIndexes = undefined;
  });

  it("renders one divider between pinned and ordinary blocks", () => {
    const { container, root } = renderVirtualBlockList([
      createBlock("pinned-1", { isPinned: true }),
      createBlock("pinned-2", { isPinned: true }),
      createBlock("ordinary-1"),
      createBlock("ordinary-2"),
    ]);
    mountedRoot = root;
    mountedContainer = container;

    const dividers = container.querySelectorAll("[data-pinned-section-divider]");

    expect(dividers).toHaveLength(1);
    expect(dividers[0]?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("[data-block-row]")).toHaveLength(4);
  });

  it("does not render a divider when there is no pinned-to-ordinary boundary", () => {
    const ordinaryList = renderVirtualBlockList([
      createBlock("ordinary-1"),
      createBlock("ordinary-2"),
    ]);
    mountedRoot = ordinaryList.root;
    mountedContainer = ordinaryList.container;

    expect(ordinaryList.container.querySelector("[data-pinned-section-divider]")).toBeNull();

    act(() => {
      mountedRoot?.unmount();
    });
    mountedRoot = null;
    mountedContainer.remove();
    mountedContainer = null;

    const pinnedList = renderVirtualBlockList([
      createBlock("pinned-1", { isPinned: true }),
      createBlock("pinned-2", { isPinned: true }),
    ]);
    mountedRoot = pinnedList.root;
    mountedContainer = pinnedList.container;

    expect(pinnedList.container.querySelector("[data-pinned-section-divider]")).toBeNull();
  });

  it("requests the block before the visible range for boundary detection", () => {
    mocks.virtualIndexes = [2, 3];
    const { ensureBlockRange, root, container } = renderVirtualBlockList([
      createBlock("pinned-1", { isPinned: true }),
      createBlock("pinned-2", { isPinned: true }),
      createBlock("ordinary-1"),
      createBlock("ordinary-2"),
    ]);
    mountedRoot = root;
    mountedContainer = container;

    expect(ensureBlockRange).toHaveBeenCalledWith(1, 3);
  });
});
