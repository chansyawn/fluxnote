import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isRegistered: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
}));

vi.mock("electron", () => ({
  globalShortcut: {
    isRegistered: mocks.isRegistered,
    register: mocks.register,
    unregister: mocks.unregister,
  },
}));

import { registerShortcutCommands } from "./command";

describe("shortcut command", () => {
  beforeEach(() => {
    mocks.isRegistered.mockReset();
    mocks.register.mockReset();
    mocks.unregister.mockReset();
  });

  it("registers and emits event", () => {
    const handlers = new Map<string, (input: { shortcut: string }) => unknown>();
    const emit = vi.fn(() => true);
    const ipc = {
      command: vi.fn((name: string, handler: (input: { shortcut: string }) => unknown) =>
        handlers.set(name, handler),
      ),
    };
    mocks.isRegistered.mockReturnValue(false);
    mocks.register.mockImplementation((_shortcut, callback: () => void) => {
      callback();
      return true;
    });

    registerShortcutCommands(ipc as never, { events: { emit } } as never);
    expect(handlers.get("shortcut.is-registered")?.({ shortcut: "Alt+N" })).toBe(false);
    expect(handlers.get("shortcut.register")?.({ shortcut: "Alt+N" })).toBeUndefined();
    expect(emit).toHaveBeenCalledWith("shortcut.pressed", { shortcut: "Alt+N", state: "Pressed" });
  });

  it("throws when registration fails", () => {
    const handlers = new Map<string, (input: { shortcut: string }) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: { shortcut: string }) => unknown) =>
        handlers.set(name, handler),
      ),
    };
    mocks.isRegistered.mockReturnValue(false);
    mocks.register.mockReturnValue(false);

    registerShortcutCommands(ipc as never, { events: { emit: vi.fn() } } as never);

    expect(() => handlers.get("shortcut.register")?.({ shortcut: "Alt+N" })).toThrowError(
      /Failed to register global shortcut/,
    );
  });

  it("unregisters existing shortcut before re-registering", () => {
    const handlers = new Map<string, (input: { shortcut: string }) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: { shortcut: string }) => unknown) =>
        handlers.set(name, handler),
      ),
    };
    mocks.isRegistered.mockReturnValue(true);
    mocks.register.mockReturnValue(true);

    registerShortcutCommands(ipc as never, { events: { emit: vi.fn() } } as never);
    handlers.get("shortcut.register")?.({ shortcut: "Alt+N" });

    expect(mocks.unregister).toHaveBeenCalledWith("Alt+N");
  });

  it("unregister command delegates to globalShortcut.unregister", () => {
    const handlers = new Map<string, (input: { shortcut: string }) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: { shortcut: string }) => unknown) =>
        handlers.set(name, handler),
      ),
    };

    registerShortcutCommands(ipc as never, { events: { emit: vi.fn() } } as never);
    const result = handlers.get("shortcut.unregister")?.({ shortcut: "Alt+N" });

    expect(result).toBeUndefined();
    expect(mocks.unregister).toHaveBeenCalledWith("Alt+N");
  });
});
