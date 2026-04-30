import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
  parseDeepLinkCommand,
} from "@main/features/deep-link/deep-link-handler";
import { describe, expect, it, vi } from "vite-plus/test";

describe("deep link command", () => {
  it("extracts flux urls from argv", () => {
    expect(extractDeepLinkFromArgv(["--flag", "flux://block/block-1"])).toBe(
      "flux://block/block-1",
    );
    expect(extractDeepLinkFromArgv(["--flag"])).toBeNull();
  });

  it("parses app open deep links", () => {
    expect(parseDeepLinkCommand("flux://app/open")).toEqual({
      command: "app.open",
      payload: null,
    });
  });

  it("parses block open deep links", () => {
    expect(parseDeepLinkCommand("flux://block/block-1")).toEqual({
      command: "block.open",
      payload: { blockId: "block-1" },
    });
    expect(parseDeepLinkCommand("flux://block/folder%2Fblock-1")).toEqual({
      command: "block.open",
      payload: { blockId: "folder%2Fblock-1" },
    });
  });

  it("rejects invalid deep links", () => {
    expect(parseDeepLinkCommand("https://block/block-1")).toBeNull();
    expect(parseDeepLinkCommand("flux://tag/tag-1")).toBeNull();
    expect(parseDeepLinkCommand("not a url")).toBeNull();
  });

  it("dispatches parsed deep link commands", async () => {
    const dispatchCommand = vi.fn(async () => null);
    const command = createDeepLinkHandler({ dispatchCommand });

    await expect(command.handle("flux://block/block-1")).resolves.toBe(true);

    expect(dispatchCommand).toHaveBeenCalledWith("block.open", { blockId: "block-1" });
  });

  it("ignores invalid deep links without dispatching commands", async () => {
    const dispatchCommand = vi.fn(async () => null);
    const command = createDeepLinkHandler({ dispatchCommand });

    await expect(command.handle("flux://tag/tag-1")).resolves.toBe(false);

    expect(dispatchCommand).not.toHaveBeenCalled();
  });
});
