import { ipcCommandContracts } from "@shared/ipc/contracts";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: electronMock.handle,
  },
}));

import { defineIpcCommand } from "@main/core/ipc/define-ipc-command";

describe("defineIpcCommand", () => {
  beforeEach(() => {
    electronMock.handle.mockClear();
  });

  it("rejects invocations from untrusted senders", async () => {
    const trustedSender = {};
    defineIpcCommand<"sampleGreet">({
      command: ipcCommandContracts.sampleGreet,
      getTrustedWebContents: () => trustedSender as never,
      run: async (request) => ({ message: request.name }),
    });

    const registeredHandler = electronMock.handle.mock.calls[0]?.[1] as (
      event: { sender: unknown },
      payload: unknown,
    ) => Promise<{ ok: boolean; error?: { type: string }; data?: unknown }>;
    const result = await registeredHandler({ sender: {} }, { name: "FluxNote" });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ type: "BUSINESS.INVALID_INVOKE" }),
      }),
    );
  });

  it("parses requests and returns successful responses for trusted senders", async () => {
    const trustedSender = {};
    defineIpcCommand<"sampleGreet">({
      command: ipcCommandContracts.sampleGreet,
      getTrustedWebContents: () => trustedSender as never,
      run: async (request) => ({ message: `Hello ${request.name}` }),
    });

    const registeredHandler = electronMock.handle.mock.calls[0]?.[1] as (
      event: { sender: unknown },
      payload: unknown,
    ) => Promise<{ ok: boolean; data?: unknown }>;
    const result = await registeredHandler({ sender: trustedSender }, { name: "FluxNote" });

    expect(result).toEqual({
      ok: true,
      data: { message: "Hello FluxNote" },
    });
  });
});
