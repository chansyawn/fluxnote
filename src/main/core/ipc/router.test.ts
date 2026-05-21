import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: mocks.handle,
  },
}));

import { createIpcRouter } from "./router";

describe("createIpcRouter", () => {
  beforeEach(() => {
    mocks.handle.mockReset();
  });

  it("returns business error when sender is untrusted", async () => {
    const router = createIpcRouter({ isSenderTrusted: () => false });
    router.command("window.hide", async () => undefined);
    router.register();

    const handler = mocks.handle.mock.calls[0][1] as (
      event: unknown,
      rawInput: unknown,
    ) => Promise<unknown>;
    const result = await handler({ sender: {} }, undefined);

    expect(result).toMatchObject({ ok: false, error: { code: "BUSINESS.INVALID_INVOKE" } });
  });

  it("parses input and output for valid command", async () => {
    const router = createIpcRouter({ isSenderTrusted: () => true });
    router.command("window.toggle", async () => undefined);
    router.register();

    const handler = mocks.handle.mock.calls[0][1] as (
      event: unknown,
      rawInput: unknown,
    ) => Promise<unknown>;
    const result = await handler({ sender: {} }, undefined);

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("returns business error for invalid input", async () => {
    const router = createIpcRouter({ isSenderTrusted: () => true });
    router.command("window.toggle", async () => undefined);
    router.register();

    const handler = mocks.handle.mock.calls[0][1] as (
      event: unknown,
      rawInput: unknown,
    ) => Promise<unknown>;
    const result = await handler({ sender: {} }, { invalid: true });

    expect(result).toMatchObject({ ok: false, error: { code: "BUSINESS.INVALID_INVOKE" } });
  });

  it("maps handler exception to INTERNAL error", async () => {
    const router = createIpcRouter({ isSenderTrusted: () => true });
    router.command("window.destroy", async () => {
      throw new Error("boom");
    });
    router.register();

    const handler = mocks.handle.mock.calls[0][1] as (
      event: unknown,
      rawInput: unknown,
    ) => Promise<unknown>;
    const result = await handler({ sender: {} }, undefined);

    expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
  });
});
