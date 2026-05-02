import { describe, expect, it, vi } from "vitest";

import { registerWindowCommands } from "./command";

describe("window command", () => {
  it("dispatches destroy/hide/toggle", () => {
    const handlers = new Map<string, () => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: () => unknown) => handlers.set(name, handler)),
    };
    const windowManager = {
      requestQuit: vi.fn(),
      hideMainWindow: vi.fn(),
      toggleMainWindow: vi.fn(),
    };

    registerWindowCommands(ipc as never, { windowManager } as never);

    expect(handlers.get("window.destroy")?.()).toBeUndefined();
    expect(handlers.get("window.hide")?.()).toBeUndefined();
    expect(handlers.get("window.toggle")?.()).toBeUndefined();
    expect(windowManager.requestQuit).toHaveBeenCalled();
    expect(windowManager.hideMainWindow).toHaveBeenCalled();
    expect(windowManager.toggleMainWindow).toHaveBeenCalled();
  });
});
