import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBlockRecord: vi.fn(),
}));

vi.mock("../blocks/service", () => ({
  createBlockRecord: mocks.createBlockRecord,
}));

import { registerWindowCommands } from "./command";

describe("window command", () => {
  it("dispatches destroy/hide/toggle", () => {
    const handlers = new Map<string, () => void | Promise<{ blockId: string }>>();
    const ipc = {
      command: vi.fn((name: string, handler: () => void | Promise<{ blockId: string }>) =>
        handlers.set(name, handler),
      ),
    };
    const windowManager = {
      requestQuit: vi.fn(),
      hideMainWindow: vi.fn(),
      toggleMainWindow: vi.fn(),
      showMainWindow: vi.fn(),
    };
    const openBlockService = { requestOpen: vi.fn() };

    registerWindowCommands(ipc as never, {
      db: {} as never,
      openBlockService: openBlockService as never,
      windowManager: windowManager as never,
    });

    expect(handlers.get("window.destroy")?.()).toBeUndefined();
    expect(handlers.get("window.hide")?.()).toBeUndefined();
    expect(handlers.get("window.toggle")?.()).toBeUndefined();
    expect(windowManager.requestQuit).toHaveBeenCalled();
    expect(windowManager.hideMainWindow).toHaveBeenCalled();
    expect(windowManager.toggleMainWindow).toHaveBeenCalled();
  });

  it("captures block and requests focus when window.capture-block is called", async () => {
    const handlers = new Map<string, () => void | Promise<{ blockId: string }>>();
    const ipc = {
      command: vi.fn((name: string, handler: () => void | Promise<{ blockId: string }>) =>
        handlers.set(name, handler),
      ),
    };
    const db = {};
    const windowManager = {
      requestQuit: vi.fn(),
      hideMainWindow: vi.fn(),
      toggleMainWindow: vi.fn(),
      showMainWindow: vi.fn(),
    };
    const openBlockService = { requestOpen: vi.fn() };

    const block = {
      id: "block-1",
    };
    mocks.createBlockRecord.mockResolvedValue(block);

    registerWindowCommands(ipc as never, {
      db: db as never,
      openBlockService: openBlockService as never,
      windowManager: windowManager as never,
    });

    const result = await handlers.get("window.capture-block")?.();

    expect(result).toEqual({ blockId: "block-1" });
    expect(windowManager.showMainWindow).toHaveBeenCalledOnce();
    expect(openBlockService.requestOpen).toHaveBeenCalledWith({ blockId: "block-1" });
    expect(mocks.createBlockRecord).toHaveBeenCalledWith(db);
  });
});
