import { blockNavigationReducer } from "@renderer/routes/_workspace/-features/use-block-navigation";
import { describe, expect, it } from "vite-plus/test";

type NavigationState = Parameters<typeof blockNavigationReducer>[0];
type NavigationEvent = Parameters<typeof blockNavigationReducer>[1];
type NavigationRequest = Extract<NavigationEvent, { type: "start" }>["request"];

function blockRequest(overrides: Partial<NavigationRequest> = {}): NavigationRequest {
  return {
    align: "start",
    blockId: "block-1",
    focus: "editor",
    kind: "block-id",
    requestId: 1,
    viewMode: "current",
    ...overrides,
  } as NavigationRequest;
}

describe("blockNavigationReducer", () => {
  it("starts current-view requests at target resolution", () => {
    const state = blockNavigationReducer(
      { phase: "idle" },
      { type: "start", request: blockRequest() },
    );

    expect(state).toEqual({ phase: "resolving-target", request: blockRequest() });
  });

  it("prepares active-unfiltered requests before resolving", () => {
    const request = blockRequest({ viewMode: "active-unfiltered" });
    const preparing = blockNavigationReducer({ phase: "idle" }, { type: "start", request });
    const resolving = blockNavigationReducer(preparing, { type: "view-ready", requestId: 1 });

    expect(preparing).toEqual({ phase: "preparing-view", request });
    expect(resolving).toEqual({ phase: "resolving-target", request });
  });

  it("moves through page load, render, focus, and finish", () => {
    const request = blockRequest();
    const target = { blockId: "block-1", index: 3 };
    const resolving = blockNavigationReducer({ phase: "idle" }, { type: "start", request });
    const ensuring = blockNavigationReducer(resolving, {
      type: "target-resolved",
      requestId: 1,
      target,
    });
    const scrolling = blockNavigationReducer(ensuring, {
      type: "page-loaded",
      requestId: 1,
      target,
    });
    const focusing = blockNavigationReducer(scrolling, {
      type: "target-rendered",
      requestId: 1,
      target,
    });
    const idle = blockNavigationReducer(focusing, { type: "finish", requestId: 1 });

    expect(ensuring).toEqual({ phase: "ensuring-page", request, target });
    expect(scrolling).toEqual({ phase: "scrolling", request, target });
    expect(focusing).toEqual({ phase: "focusing", request, target });
    expect(idle).toEqual({ phase: "idle" });
  });

  it("ignores stale async events from cancelled requests", () => {
    const staleRequest = blockRequest({ requestId: 1 });
    const currentRequest = blockRequest({ blockId: "block-2", requestId: 2 });
    const staleResolving = blockNavigationReducer(
      { phase: "idle" },
      { type: "start", request: staleRequest },
    );
    const currentResolving = blockNavigationReducer(staleResolving, {
      type: "start",
      request: currentRequest,
    });
    const afterStaleEvent = blockNavigationReducer(currentResolving, {
      type: "target-resolved",
      requestId: 1,
      target: { blockId: "block-1", index: 0 },
    });

    expect(afterStaleEvent).toEqual({ phase: "resolving-target", request: currentRequest });
  });

  it("clears current request on failure", () => {
    const state: NavigationState = { phase: "resolving-target", request: blockRequest() };

    expect(blockNavigationReducer(state, { type: "fail", requestId: 1 })).toEqual({
      phase: "idle",
    });
  });
});
