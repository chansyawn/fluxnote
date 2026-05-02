import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "./event-bus";

function createWindow() {
  const send = vi.fn();
  let onClosed: (() => void) | null = null;

  return {
    win: {
      isDestroyed: vi.fn(() => false),
      on: vi.fn((name: string, cb: () => void) => {
        if (name === "closed") {
          onClosed = cb;
        }
      }),
      webContents: {
        send,
      },
    },
    send,
    close: () => onClosed?.(),
  };
}

describe("createEventBus", () => {
  it("registers window and emits typed event", () => {
    const { win, send } = createWindow();
    const bus = createEventBus();

    bus.registerWindow(win as never);
    const emitted = bus.emit("window.focus-changed", true);

    expect(emitted).toBe(true);
    expect(send).toHaveBeenCalledWith("window.focus-changed", true);
  });

  it("returns false when payload is invalid", () => {
    const { win, send } = createWindow();
    const bus = createEventBus();

    bus.registerWindow(win as never);
    const emitted = bus.emit("window.focus-changed", "bad" as never);

    expect(emitted).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("trusts only registered sender and removes closed window", () => {
    const windowA = createWindow();
    const windowB = createWindow();
    const bus = createEventBus();

    bus.registerWindow(windowA.win as never);

    expect(bus.isSenderTrusted(windowA.win.webContents as never)).toBe(true);
    expect(bus.isSenderTrusted(windowB.win.webContents as never)).toBe(false);

    windowA.close();
    expect(bus.isSenderTrusted(windowA.win.webContents as never)).toBe(false);
  });
});
