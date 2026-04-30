import { createIpcEventBus } from "@main/core/ipc/event-bus";
import { openBlockApi } from "@shared/features/open-block";
import { windowApi } from "@shared/features/window";
import type { BrowserWindow } from "electron";
import { describe, expect, it, vi } from "vite-plus/test";

describe("createIpcEventBus", () => {
  it("sends validated payloads to the configured event channel", () => {
    const send = vi.fn();
    const emitEvent = createIpcEventBus({
      getMainWindow: () =>
        ({
          isDestroyed: () => false,
          webContents: { send },
        }) as unknown as BrowserWindow,
    });

    const emitted = emitEvent(windowApi.events.focusChanged, true);

    expect(emitted).toBe(true);
    expect(send).toHaveBeenCalledWith("fluxnotes:window:event:focusChanged", true);
  });

  it("drops invalid payloads", () => {
    const send = vi.fn();
    const emitEvent = createIpcEventBus({
      getMainWindow: () =>
        ({
          isDestroyed: () => false,
          webContents: { send },
        }) as unknown as BrowserWindow,
    });

    const emitted = emitEvent(openBlockApi.events.requested, { nope: true } as never);

    expect(emitted).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
