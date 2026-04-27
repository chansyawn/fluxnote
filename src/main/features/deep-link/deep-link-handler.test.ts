import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
  parseDeepLinkCommand,
} from "@main/features/deep-link/deep-link-handler";
import { describe, expect, it, vi } from "vite-plus/test";

describe("deep link command", () => {
  it("extracts fluxnote urls from argv", () => {
    expect(extractDeepLinkFromArgv(["--flag", "fluxnote://block/block-1"])).toBe(
      "fluxnote://block/block-1",
    );
    expect(extractDeepLinkFromArgv(["--flag"])).toBeNull();
  });

  it("parses app open deep links", () => {
    expect(parseDeepLinkCommand("fluxnote://app/open")).toEqual({
      command: "app.open",
      payload: null,
    });
  });

  it("parses block open deep links", () => {
    expect(parseDeepLinkCommand("fluxnote://block/block-1")).toEqual({
      command: "block.open",
      payload: { blockId: "block-1" },
    });
    expect(parseDeepLinkCommand("fluxnote://block/folder%2Fblock-1")).toEqual({
      command: "block.open",
      payload: { blockId: "folder%2Fblock-1" },
    });
  });

  it("rejects invalid deep links", () => {
    expect(parseDeepLinkCommand("https://block/block-1")).toBeNull();
    expect(parseDeepLinkCommand("fluxnote://tag/tag-1")).toBeNull();
    expect(parseDeepLinkCommand("not a url")).toBeNull();
  });

  it("dispatches parsed deep link commands", async () => {
    const dispatchCommand = vi.fn(async () => null);
    const command = createDeepLinkHandler({ dispatchCommand });

    await expect(command.handle("fluxnote://block/block-1")).resolves.toBe(true);

    expect(dispatchCommand).toHaveBeenCalledWith("block.open", { blockId: "block-1" });
  });

  it("ignores invalid deep links without dispatching commands", async () => {
    const dispatchCommand = vi.fn(async () => null);
    const command = createDeepLinkHandler({ dispatchCommand });

    await expect(command.handle("fluxnote://tag/tag-1")).resolves.toBe(false);

    expect(dispatchCommand).not.toHaveBeenCalled();
  });
});
