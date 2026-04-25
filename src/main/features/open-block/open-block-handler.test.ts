import { createOpenBlockHandler } from "@main/features/open-block/open-block-handler";
import { describe, expect, it, vi } from "vite-plus/test";

function createTestHandler() {
  const emitEvent = vi.fn(() => true);
  const showWindow = vi.fn();
  const handler = createOpenBlockHandler({ emitEvent, showWindow });

  return { emitEvent, handler, showWindow };
}

describe("open block handler", () => {
  it("keeps pending block id after emit until acknowledged", () => {
    const { emitEvent, handler, showWindow } = createTestHandler();

    expect(handler.requestOpen("block-1")).toBe(true);

    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(emitEvent).toHaveBeenCalledWith("openBlockRequested", { blockId: "block-1" });
    expect(handler.readPending()).toEqual({ blockId: "block-1" });

    handler.acknowledgePending("block-1");

    expect(handler.readPending()).toEqual({ blockId: null });
  });

  it("does not clear pending block id for nonmatching acknowledgements", () => {
    const { handler } = createTestHandler();

    handler.requestOpen("block-1");
    handler.acknowledgePending("block-2");

    expect(handler.readPending()).toEqual({ blockId: "block-1" });
  });

  it("overwrites pending block id with newer requests", () => {
    const { handler } = createTestHandler();

    handler.requestOpen("block-1");
    handler.requestOpen("block-2");

    expect(handler.readPending()).toEqual({ blockId: "block-2" });
  });
});
