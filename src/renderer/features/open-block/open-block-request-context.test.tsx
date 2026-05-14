// @vitest-environment jsdom

import {
  OpenBlockRequestProvider,
  OpenBlockWorkspaceRouteSync,
} from "@renderer/features/open-block/open-block-request-context";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  acknowledgePendingOpenBlock: vi.fn(),
  onOpenBlockRequested: vi.fn(),
  readPendingOpenBlock: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  acknowledgePendingOpenBlock: clientMocks.acknowledgePendingOpenBlock,
  onOpenBlockRequested: clientMocks.onOpenBlockRequested,
  readPendingOpenBlock: clientMocks.readPendingOpenBlock,
}));

type OpenBlockRequestedHandler = (payload: { blockId: string }) => void;

interface RouteHarness {
  emitOpenBlockRequest: OpenBlockRequestedHandler;
  getPathname: () => string;
  unmount: () => void;
}

function createRouteTree() {
  const rootRoute = createRootRoute({
    component: () => (
      <OpenBlockRequestProvider>
        <OpenBlockWorkspaceRouteSync />
        <Outlet />
      </OpenBlockRequestProvider>
    ),
  });
  const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>workspace</div>,
  });
  const preferencesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/preferences",
    component: () => <div>preferences</div>,
  });
  const labRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/lab",
    component: () => <div>lab</div>,
  });

  return rootRoute.addChildren([workspaceRoute, preferencesRoute, labRoute]);
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

async function createHarness(
  initialPath: string,
  options?: { pendingTarget?: { blockId: string } | null },
): Promise<RouteHarness> {
  let openBlockHandler: OpenBlockRequestedHandler | null = null;
  clientMocks.onOpenBlockRequested.mockImplementation((handler: OpenBlockRequestedHandler) => {
    openBlockHandler = handler;
    return vi.fn();
  });
  clientMocks.readPendingOpenBlock.mockResolvedValue({ target: options?.pendingTarget ?? null });
  clientMocks.acknowledgePendingOpenBlock.mockResolvedValue(undefined);

  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({ history, routeTree: createRouteTree() });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<RouterProvider router={router} />);
  });
  await flushEffects();

  if (!openBlockHandler) {
    throw new Error("Open block request listener was not registered.");
  }

  return {
    emitOpenBlockRequest: (payload) => {
      openBlockHandler?.(payload);
    },
    getPathname: () => router.state.location.pathname,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("OpenBlockWorkspaceRouteSync", () => {
  let mountedHarness: RouteHarness | null = null;

  afterEach(() => {
    mountedHarness?.unmount();
    mountedHarness = null;
    clientMocks.acknowledgePendingOpenBlock.mockReset();
    clientMocks.onOpenBlockRequested.mockReset();
    clientMocks.readPendingOpenBlock.mockReset();
  });

  it("navigates from preferences to the workspace for external block requests", async () => {
    const harness = await createHarness("/preferences");
    mountedHarness = harness;

    act(() => {
      harness.emitOpenBlockRequest({ blockId: "block-1" });
    });
    await flushEffects();

    expect(harness.getPathname()).toBe("/");
    expect(clientMocks.acknowledgePendingOpenBlock).not.toHaveBeenCalled();
  });

  it("navigates from lab to the workspace for pending block requests", async () => {
    const harness = await createHarness("/lab", { pendingTarget: { blockId: "block-1" } });
    mountedHarness = harness;
    await flushEffects();

    expect(harness.getPathname()).toBe("/");
    expect(clientMocks.acknowledgePendingOpenBlock).not.toHaveBeenCalled();
  });

  it("keeps the current route when the workspace is already active", async () => {
    const harness = await createHarness("/");
    mountedHarness = harness;

    act(() => {
      harness.emitOpenBlockRequest({ blockId: "block-1" });
    });
    await flushEffects();

    expect(harness.getPathname()).toBe("/");
  });
});
