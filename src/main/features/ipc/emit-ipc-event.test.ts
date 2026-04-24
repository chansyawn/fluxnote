import { createEmitIpcEvent } from "@main/features/ipc/emit-ipc-event";
import type { BrowserWindow } from "electron";
import { describe, expect, it, vi } from "vite-plus/test";

describe("createEmitIpcEvent", () => {
  it("sends validated payloads to the configured event channel", () => {
    const send = vi.fn();
    const emitEvent = createEmitIpcEvent({
      getMainWindow: () =>
        ({
          isDestroyed: () => false,
          webContents: { send },
        }) as unknown as BrowserWindow,
    });

    const emitted = emitEvent("windowFocusChanged", true);

    expect(emitted).toBe(true);
    expect(send).toHaveBeenCalledWith("fluxnote:event:window://focus-changed", true);
  });

  it("drops invalid payloads", () => {
    const send = vi.fn();
    const emitEvent = createEmitIpcEvent({
      getMainWindow: () =>
        ({
          isDestroyed: () => false,
          webContents: { send },
        }) as unknown as BrowserWindow,
    });

    const emitted = emitEvent("deepLinkOpenBlock", { nope: true } as never);

    expect(emitted).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
