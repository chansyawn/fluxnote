import {
  AppInvokeError,
  invokeCommand,
  subscribeEvent,
  toAppInvokeError,
} from "@renderer/app/invoke";
import type { FluxnoteRuntime } from "@shared/platform/electron-runtime";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

function setRuntime(runtime: FluxnoteRuntime): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { fluxnote: runtime },
  });
}

describe("renderer invoke transport", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("invokes commands through the runtime transport", async () => {
    const invoke = vi.fn(async () => ({ message: "Hello FluxNote" }));
    setRuntime({
      invoke: invoke as unknown as FluxnoteRuntime["invoke"],
      subscribe: vi.fn(() => () => {}) as unknown as FluxnoteRuntime["subscribe"],
    } as FluxnoteRuntime);

    await expect(invokeCommand("sampleGreet", { name: "FluxNote" })).resolves.toEqual({
      message: "Hello FluxNote",
    });
    expect(invoke).toHaveBeenCalledWith("sampleGreet", { name: "FluxNote" });
  });

  it("wraps payload-shaped runtime failures into AppInvokeError", async () => {
    setRuntime({
      invoke: vi.fn(async () => {
        throw {
          type: "BUSINESS.NOT_FOUND",
          message: "Missing",
          details: { id: "1" },
        };
      }) as unknown as FluxnoteRuntime["invoke"],
      subscribe: vi.fn(() => () => {}) as unknown as FluxnoteRuntime["subscribe"],
    } as FluxnoteRuntime);

    await expect(invokeCommand("sampleGreet", { name: "FluxNote" })).rejects.toMatchObject({
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
      invoke: vi.fn(async () => undefined) as unknown as FluxnoteRuntime["invoke"],
      subscribe: subscribe as unknown as FluxnoteRuntime["subscribe"],
    } as FluxnoteRuntime);

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
