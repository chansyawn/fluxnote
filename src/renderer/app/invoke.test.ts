import {
  AppInvokeError,
  invokeCommand,
  subscribeEvent,
  toAppInvokeError,
} from "@renderer/app/invoke";
import type { FluxnotesRuntime } from "@shared/electron-runtime";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

function setRuntime(runtime: FluxnotesRuntime): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { fluxnotes: runtime },
  });
}

describe("renderer invoke transport", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("invokes commands through the runtime transport", async () => {
    const invoke = vi.fn(async () => undefined);
    setRuntime({
      invoke: invoke as unknown as FluxnotesRuntime["invoke"],
      subscribe: vi.fn(() => () => {}) as unknown as FluxnotesRuntime["subscribe"],
    } as FluxnotesRuntime);

    await expect(invokeCommand("windowDestroy", undefined)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("windowDestroy", undefined);
  });

  it("wraps payload-shaped runtime failures into AppInvokeError", async () => {
    setRuntime({
      invoke: vi.fn(async () => {
        throw {
          type: "BUSINESS.NOT_FOUND",
          message: "Missing",
          details: { id: "1" },
        };
      }) as unknown as FluxnotesRuntime["invoke"],
      subscribe: vi.fn(() => () => {}) as unknown as FluxnotesRuntime["subscribe"],
    } as FluxnotesRuntime);

    await expect(invokeCommand("windowDestroy", undefined)).rejects.toMatchObject({
      details: { id: "1" },
      message: "Missing",
      type: "BUSINESS.NOT_FOUND",
    });
  });

  it("subscribes to events through the runtime transport", () => {
    const unlisten = vi.fn();
    const subscribe = vi.fn(() => unlisten);
    const handler = vi.fn();
    setRuntime({
      invoke: vi.fn(async () => undefined) as unknown as FluxnotesRuntime["invoke"],
      subscribe: subscribe as unknown as FluxnotesRuntime["subscribe"],
    } as FluxnotesRuntime);

    const returnedUnlisten = subscribeEvent("windowFocusChanged", handler);

    expect(subscribe).toHaveBeenCalledWith("windowFocusChanged", handler);
    expect(returnedUnlisten).toBe(unlisten);
  });

  it("normalizes unknown errors", () => {
    const error = toAppInvokeError("boom");

    expect(error).toBeInstanceOf(AppInvokeError);
    expect(error).toMatchObject({
      details: "boom",
      message: "Unknown invoke error",
      type: "INTERNAL",
    });
  });
});
