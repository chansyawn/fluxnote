import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";
import type { EntrypointEnvelope } from "@shared/features/entrypoints/envelope";
import type { IpcResult } from "@shared/ipc/result";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  createEntrypointEnvelope: vi.fn(),
}));

vi.mock("@shared/features/entrypoints/envelope", async () => {
  const actual = await vi.importActual("@shared/features/entrypoints/envelope");
  return {
    ...actual,
    createEntrypointEnvelope: mocks.createEntrypointEnvelope,
  };
});

import { createDeepLinkHandler, extractDeepLinkFromArgv, parseDeepLinkEnvelope } from "./handler";

describe("deep-link handler", () => {
  it("extracts deep-link from argv", () => {
    expect(extractDeepLinkFromArgv(["node", "flux://app/open"])).toBe("flux://app/open");
    expect(extractDeepLinkFromArgv(["node", "x"])).toBeNull();
  });

  it("parses supported deep links", () => {
    mocks.createEntrypointEnvelope.mockImplementation((input) => input);

    expect(parseDeepLinkEnvelope("flux://app/open")).toMatchObject({
      command: "app.open",
      source: "deep-link",
    });
    expect(parseDeepLinkEnvelope("flux://block/abc")).toMatchObject({
      command: "block.open",
      payload: { blockId: "abc" },
      source: "deep-link",
    });
  });

  it("returns null for unsupported deep links", () => {
    expect(parseDeepLinkEnvelope("http://app/open")).toBeNull();
    expect(parseDeepLinkEnvelope("flux://app/unknown")).toBeNull();
    expect(parseDeepLinkEnvelope("not-a-url")).toBeNull();
  });

  it("dispatches parsed envelope", async () => {
    mocks.createEntrypointEnvelope.mockImplementation((input) => input);
    const dispatchEnvelopeMock = vi.fn(async (_envelope: unknown) => ({
      data: null,
      ok: true as const,
    }));
    const dispatchEnvelope = (async <TKey extends BackendCommandKey>(
      envelope: EntrypointEnvelope<TKey>,
    ): Promise<IpcResult<BackendCommandResponse<TKey>>> => {
      const result = await dispatchEnvelopeMock(envelope);
      return {
        ok: result.ok,
        data: result.data as BackendCommandResponse<TKey>,
      };
    }) as <TKey extends BackendCommandKey>(
      envelope: EntrypointEnvelope<TKey>,
    ) => Promise<IpcResult<BackendCommandResponse<TKey>>>;
    const handler = createDeepLinkHandler({ dispatchEnvelope });

    await expect(handler.handle("flux://app/open")).resolves.toBe(true);
    await expect(handler.handle("flux://app/unknown")).resolves.toBe(false);
    expect(dispatchEnvelopeMock).toHaveBeenCalledTimes(1);
  });
});
