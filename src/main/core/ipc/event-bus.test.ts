import { describe, expect, it, vi } from "vite-plus/test";

import { createEventBus } from "./event-bus";

describe("createEventBus", () => {
  it("sends validated payloads to registered windows", () => {
    const send = vi.fn();
    let onClosed: (() => void) | undefined;
    const webContents = { send };
    const win = {
      isDestroyed: () => false,
      on: (_event: string, handler: () => void) => {
        onClosed = handler;
      },
      webContents,
    };

    const bus = createEventBus();
    bus.registerWindow(win as never);

    const emitted = bus.emit("window.focus-changed", true);

    expect(emitted).toBe(true);
    expect(send).toHaveBeenCalledWith("window.focus-changed", true);

    if (onClosed) {
      onClosed();
    }
    expect(bus.isSenderTrusted(webContents as never)).toBe(false);
  });

  it("drops invalid payloads", () => {
    const send = vi.fn();
    const bus = createEventBus();
    bus.registerWindow({
      isDestroyed: () => false,
      on: () => {},
      webContents: { send },
    } as never);

    const emitted = bus.emit("open-block.requested", { nope: true } as never);

    expect(emitted).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
