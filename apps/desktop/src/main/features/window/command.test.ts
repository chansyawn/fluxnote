import { describe, expect, it, vi } from "vite-plus/test";

import { registerWindowCommands } from "./command";

describe("window command", () => {
  it("dispatches destroy/hide/restart/toggle", () => {
    const handlers = new Map<string, () => void>();
    const ipc = {
      command: vi.fn((name: string, handler: () => void) => handlers.set(name, handler)),
    };
    const windowManager = {
      hideMainWindow: vi.fn(),
      requestQuit: vi.fn(),
      restartApp: vi.fn(),
      toggleMainWindow: vi.fn(),
    };

    registerWindowCommands(ipc as never, {
      windowManager: windowManager as never,
    });

    expect(handlers.get("window.destroy")?.()).toBeUndefined();
    expect(handlers.get("window.hide")?.()).toBeUndefined();
    expect(handlers.get("window.restart")?.()).toBeUndefined();
    expect(handlers.get("window.toggle")?.()).toBeUndefined();
    expect(windowManager.requestQuit).toHaveBeenCalledOnce();
    expect(windowManager.hideMainWindow).toHaveBeenCalledOnce();
    expect(windowManager.restartApp).toHaveBeenCalledOnce();
    expect(windowManager.toggleMainWindow).toHaveBeenCalledOnce();
  });
});
