import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
  parseDeepLinkBlockId,
} from "@main/features/deep-link/deep-link-handler";
import { describe, expect, it, vi } from "vite-plus/test";

function createTestHandler() {
  const emitEvent = vi.fn(() => true);
  const showWindow = vi.fn();
  const handler = createDeepLinkHandler({ emitEvent, showWindow });

  return { emitEvent, handler, showWindow };
}

describe("deep link handler", () => {
  it("extracts fluxnote urls from argv", () => {
    expect(extractDeepLinkFromArgv(["--flag", "fluxnote://block/block-1"])).toBe(
      "fluxnote://block/block-1",
    );
    expect(extractDeepLinkFromArgv(["--flag"])).toBeNull();
  });

  it("parses block ids from valid deep links", () => {
    expect(parseDeepLinkBlockId("fluxnote://block/block-1")).toBe("block-1");
    expect(parseDeepLinkBlockId("fluxnote://block/folder%2Fblock-1")).toBe("folder%2Fblock-1");
  });

  it("rejects invalid deep links", () => {
    expect(parseDeepLinkBlockId("https://block/block-1")).toBeNull();
    expect(parseDeepLinkBlockId("fluxnote://tag/tag-1")).toBeNull();
    expect(parseDeepLinkBlockId("not a url")).toBeNull();
  });

  it("keeps pending block id after emit until acknowledged", () => {
    const { emitEvent, handler, showWindow } = createTestHandler();

    expect(handler.handle("fluxnote://block/block-1")).toBe(true);

    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(emitEvent).toHaveBeenCalledWith("deepLinkOpenBlock", { blockId: "block-1" });
    expect(handler.readPending()).toEqual({ blockId: "block-1" });

    handler.acknowledgePending("block-1");

    expect(handler.readPending()).toEqual({ blockId: null });
  });

  it("does not clear pending block id for nonmatching acknowledgements", () => {
    const { handler } = createTestHandler();

    handler.handle("fluxnote://block/block-1");
    handler.acknowledgePending("block-2");

    expect(handler.readPending()).toEqual({ blockId: "block-1" });
  });

  it("overwrites pending block id with newer deep links", () => {
    const { handler } = createTestHandler();

    handler.handle("fluxnote://block/block-1");
    handler.handle("fluxnote://block/block-2");

    expect(handler.readPending()).toEqual({ blockId: "block-2" });
  });

  it("ignores invalid deep links without showing the window", () => {
    const { emitEvent, handler, showWindow } = createTestHandler();

    expect(handler.handle("fluxnote://tag/tag-1")).toBe(false);

    expect(showWindow).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
    expect(handler.readPending()).toEqual({ blockId: null });
  });
});
