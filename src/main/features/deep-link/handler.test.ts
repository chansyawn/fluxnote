import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
  parseDeepLinkEnvelope,
} from "@main/features/deep-link/handler";
import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";
import type { EntrypointEnvelope } from "@shared/features/entrypoints/envelope";
import { describe, expect, it, vi } from "vite-plus/test";

describe("deep link command", () => {
  it("extracts flux urls from argv", () => {
    expect(extractDeepLinkFromArgv(["--flag", "flux://block/block-1"])).toBe(
      "flux://block/block-1",
    );
    expect(extractDeepLinkFromArgv(["--flag"])).toBeNull();
  });

  it("parses app open deep links", () => {
    expect(parseDeepLinkEnvelope("flux://app/open")).toEqual(
      expect.objectContaining({
        command: "app.open",
        kind: "command",
        meta: {
          source: "deep-link",
          timestamp: expect.any(Number),
        },
        payload: null,
      }),
    );
  });

  it("parses block open deep links", () => {
    expect(parseDeepLinkEnvelope("flux://block/block-1")).toEqual(
      expect.objectContaining({
        command: "block.open",
        kind: "command",
        meta: {
          source: "deep-link",
          timestamp: expect.any(Number),
        },
        payload: { blockId: "block-1" },
      }),
    );
    expect(parseDeepLinkEnvelope("flux://block/folder%2Fblock-1")).toEqual(
      expect.objectContaining({
        command: "block.open",
        kind: "command",
        meta: {
          source: "deep-link",
          timestamp: expect.any(Number),
        },
        payload: { blockId: "folder%2Fblock-1" },
      }),
    );
  });

  it("rejects invalid deep links", () => {
    expect(parseDeepLinkEnvelope("https://block/block-1")).toBeNull();
    expect(parseDeepLinkEnvelope("flux://tag/tag-1")).toBeNull();
    expect(parseDeepLinkEnvelope("not a url")).toBeNull();
  });

  it("dispatches parsed deep link commands", async () => {
    const dispatchEnvelope = vi.fn(
      async <TKey extends BackendCommandKey>(_envelope: EntrypointEnvelope<TKey>) => ({
        data: null as BackendCommandResponse<TKey>,
        ok: true as const,
      }),
    ) as Parameters<typeof createDeepLinkHandler>[0]["dispatchEnvelope"];
    const command = createDeepLinkHandler({ dispatchEnvelope });

    await expect(command.handle("flux://block/block-1")).resolves.toBe(true);

    expect(dispatchEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "block.open",
        payload: { blockId: "block-1" },
      }),
    );
  });

  it("ignores invalid deep links without dispatching commands", async () => {
    const dispatchEnvelope = vi.fn(
      async <TKey extends BackendCommandKey>(_envelope: EntrypointEnvelope<TKey>) => ({
        data: null as BackendCommandResponse<TKey>,
        ok: true as const,
      }),
    ) as Parameters<typeof createDeepLinkHandler>[0]["dispatchEnvelope"];
    const command = createDeepLinkHandler({ dispatchEnvelope });

    await expect(command.handle("flux://tag/tag-1")).resolves.toBe(false);

    expect(dispatchEnvelope).not.toHaveBeenCalled();
  });

  it("returns true when deep link is recognized but dispatch fails", async () => {
    let dispatchCount = 0;
    const dispatchEnvelope: Parameters<
      typeof createDeepLinkHandler
    >[0]["dispatchEnvelope"] = async (_envelope) => {
      dispatchCount += 1;
      return {
        error: {
          code: "INTERNAL",
          details: null,
          message: "boom",
        },
        ok: false,
      };
    };
    const command = createDeepLinkHandler({ dispatchEnvelope });

    await expect(command.handle("flux://block/block-1")).resolves.toBe(true);
    expect(dispatchCount).toBe(1);
  });
});
