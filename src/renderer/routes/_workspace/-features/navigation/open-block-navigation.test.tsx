// @vitest-environment jsdom

import { queryClient } from "@renderer/app/query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { useOpenBlockNavigation } from "./open-block-navigation";
import { BlockNavigationCancelledError } from "./use-block-navigation";

const openBlockMocks = vi.hoisted(() => ({
  acknowledgePendingBlockId: vi.fn(),
  pendingTarget: null as { blockId: string } | null,
}));

vi.mock("@renderer/features/open-block/open-block-request-context", () => ({
  useOpenBlockRequest: () => ({
    acknowledgePendingBlockId: openBlockMocks.acknowledgePendingBlockId,
    pendingTarget: openBlockMocks.pendingTarget,
  }),
}));

function OpenBlockNavigationHarness({
  navigateToBlock,
}: {
  navigateToBlock: (blockId: string) => Promise<void>;
}) {
  useOpenBlockNavigation({ navigateToBlock });
  return null;
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function renderHook(navigateToBlock: (blockId: string) => Promise<void>) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(<OpenBlockNavigationHarness navigateToBlock={navigateToBlock} />);
  });

  return {
    unmount(): void {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useOpenBlockNavigation", () => {
  let mountedRoot: { unmount: () => void } | null = null;
  let restoreConsoleWarn: (() => void) | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    restoreConsoleWarn?.();
    restoreConsoleWarn = null;
    openBlockMocks.acknowledgePendingBlockId.mockReset();
    openBlockMocks.pendingTarget = null;
    queryClient.clear();
  });

  it("acknowledges the pending block after navigation succeeds", async () => {
    openBlockMocks.pendingTarget = { blockId: "block-1" };
    const navigateToBlock = vi.fn(async () => undefined);
    mountedRoot = renderHook(navigateToBlock);

    await flushEffects();

    expect(navigateToBlock).toHaveBeenCalledWith("block-1");
    expect(openBlockMocks.acknowledgePendingBlockId).toHaveBeenCalledWith("block-1");
  });

  it("acknowledges the pending block after navigation fails", async () => {
    openBlockMocks.pendingTarget = { blockId: "missing-block" };
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    restoreConsoleWarn = () => {
      consoleWarnSpy.mockRestore();
    };
    const error = new Error("not found");
    const navigateToBlock = vi.fn(async () => {
      throw error;
    });
    mountedRoot = renderHook(navigateToBlock);

    await flushEffects();

    expect(openBlockMocks.acknowledgePendingBlockId).toHaveBeenCalledWith("missing-block");
    expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to open requested block", error);
  });

  it("acknowledges the pending block without warning after navigation is cancelled", async () => {
    openBlockMocks.pendingTarget = { blockId: "block-1" };
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    restoreConsoleWarn = () => {
      consoleWarnSpy.mockRestore();
    };
    const navigateToBlock = vi.fn(async () => {
      throw new BlockNavigationCancelledError();
    });
    mountedRoot = renderHook(navigateToBlock);

    await flushEffects();

    expect(openBlockMocks.acknowledgePendingBlockId).toHaveBeenCalledWith("block-1");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
