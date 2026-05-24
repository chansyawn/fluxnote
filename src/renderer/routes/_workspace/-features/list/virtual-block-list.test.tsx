// @vitest-environment jsdom

import type { Block } from "@renderer/clients";
import { createRendererBlock } from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  measureElement: vi.fn(),
  scrollToIndex: vi.fn(),
  virtualIndexes: undefined as number[] | undefined,
}));

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
    <article aria-label={block ? `Block ${block.id}` : "Loading block"} />
  ),
}));

import { VirtualBlockList } from "./virtual-block-list";

function renderVirtualBlockList(blocks: Block[]) {
  const ensureBlockRange = vi.fn();
  const rendered = renderWithProviders(
    <VirtualBlockList
      ensureBlockRange={ensureBlockRange}
      getBlockAtIndex={(index) => blocks[index]}
      scrollTarget={null}
      totalCount={blocks.length}
      onScrollTargetRendered={vi.fn()}
    />,
  );

  return { ensureBlockRange, ...rendered };
}

describe("VirtualBlockList", () => {
  afterEach(() => {
    mocks.measureElement.mockClear();
    mocks.scrollToIndex.mockClear();
    mocks.virtualIndexes = undefined;
  });

  it("shows one pinned section divider between Pinned Blocks and ordinary Active Blocks", () => {
    renderVirtualBlockList([
      createRendererBlock({ id: "pinned-1", isPinned: true }),
      createRendererBlock({ id: "pinned-2", isPinned: true }),
      createRendererBlock({ id: "ordinary-1" }),
      createRendererBlock({ id: "ordinary-2" }),
    ]);

    expect(screen.getByLabelText("Block pinned-1")).toBeVisible();
    expect(screen.getByLabelText("Block ordinary-2")).toBeVisible();
    expect(document.querySelectorAll("[data-pinned-section-divider]")).toHaveLength(1);
    expect(document.querySelector("[data-pinned-section-divider]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("does not show a divider when there is no pinned-to-ordinary boundary", () => {
    const ordinaryList = renderVirtualBlockList([
      createRendererBlock({ id: "ordinary-1" }),
      createRendererBlock({ id: "ordinary-2" }),
    ]);

    expect(ordinaryList.container.querySelector("[data-pinned-section-divider]")).toBeNull();

    ordinaryList.unmount();

    const pinnedList = renderVirtualBlockList([
      createRendererBlock({ id: "pinned-1", isPinned: true }),
      createRendererBlock({ id: "pinned-2", isPinned: true }),
    ]);

    expect(within(pinnedList.container).queryByText("Pinned")).not.toBeInTheDocument();
    expect(pinnedList.container.querySelector("[data-pinned-section-divider]")).toBeNull();
  });

  it("requests the Block before the visible range for pinned boundary detection", () => {
    mocks.virtualIndexes = [2, 3];
    const { ensureBlockRange } = renderVirtualBlockList([
      createRendererBlock({ id: "pinned-1", isPinned: true }),
      createRendererBlock({ id: "pinned-2", isPinned: true }),
      createRendererBlock({ id: "ordinary-1" }),
      createRendererBlock({ id: "ordinary-2" }),
    ]);

    expect(ensureBlockRange).toHaveBeenCalledWith(1, 3);
  });
});
