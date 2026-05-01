import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AppInvokeError, invokeCommand, subscribeEvent, toAppInvokeError } from "./invoke";

function setIpcBridge(bridge: {
  command: (name: string, input: unknown) => Promise<unknown>;
  on: (name: string, handler: (payload: unknown) => void) => () => void;
}): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { ipc: bridge },
  });
}

describe("renderer invoke transport", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("invokes commands through window.ipc", async () => {
    const command = vi.fn(async () => undefined);
    setIpcBridge({
      command,
      on: vi.fn(() => () => {}),
    });

    await expect(invokeCommand("window.destroy", undefined)).resolves.toBeUndefined();
    expect(command).toHaveBeenCalledWith("window.destroy", undefined);
  });

  it("wraps payload-shaped runtime failures into AppInvokeError", async () => {
    setIpcBridge({
      command: vi.fn(async () => {
        throw {
          code: "BUSINESS.NOT_FOUND",
          message: "Missing",
          details: { id: "1" },
        };
      }),
      on: vi.fn(() => () => {}),
    });

    await expect(invokeCommand("window.destroy", undefined)).rejects.toMatchObject({
      code: "BUSINESS.NOT_FOUND",
      details: { id: "1" },
      message: "Missing",
    });
  });

  it("subscribes to events through window.ipc", () => {
    const unlisten = vi.fn();
    const on = vi.fn(() => unlisten);
    const handler = vi.fn();
    setIpcBridge({
      command: vi.fn(async () => undefined),
      on,
    });

    const returnedUnlisten = subscribeEvent("window.focusChanged", handler);

    expect(on).toHaveBeenCalledWith("window.focusChanged", handler);
    expect(returnedUnlisten).toBe(unlisten);
  });

  it("normalizes unknown errors", () => {
    const error = toAppInvokeError("boom");

    expect(error).toBeInstanceOf(AppInvokeError);
    expect(error).toMatchObject({
      code: "INTERNAL",
      details: "boom",
      message: "Unknown invoke error",
    });
  });
});
