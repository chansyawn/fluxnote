import type { BrowserWindowConstructorOptions } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");
vi.stubGlobal("MAIN_WINDOW_VITE_NAME", "main_window");

const mocks = vi.hoisted(() => {
  const instances: FakeBrowserWindow[] = [];

  class FakeBrowserWindow {
    static instances = instances;
    destroyed = false;
    visible = false;
    minimized = false;
    options: unknown;
    handlers = new Map<string, Array<(...args: unknown[]) => void>>();
    onceHandlers = new Map<string, (...args: unknown[]) => void>();
    webContents = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        this.on(event, handler);
      }),
      openDevTools: vi.fn(),
    };
    constructor(options: unknown) {
      this.options = options;
      instances.push(this);
    }
    on(event: string, handler: (...args: unknown[]) => void) {
      const list = this.handlers.get(event) ?? [];
      list.push(handler);
      this.handlers.set(event, list);
      return this;
    }
    once(event: string, handler: (...args: unknown[]) => void) {
      this.onceHandlers.set(event, handler);
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      for (const h of this.handlers.get(event) ?? []) h(...args);
      const once = this.onceHandlers.get(event);
      if (once) {
        this.onceHandlers.delete(event);
        once(...args);
      }
    }
    isDestroyed() {
      return this.destroyed;
    }
    destroy() {
      this.destroyed = true;
    }
    isVisible() {
      return this.visible;
    }
    show = vi.fn(() => {
      this.visible = true;
    });
    hide = vi.fn(() => {
      this.visible = false;
    });
    focus = vi.fn();
    isMinimized() {
      return this.minimized;
    }
    restore = vi.fn(() => {
      this.minimized = false;
    });
    setPosition = vi.fn();
    setVisibleOnAllWorkspaces = vi.fn();
    loadURL = vi.fn(async () => undefined);
    loadFile = vi.fn(async () => undefined);
  }

  return {
    BrowserWindow: FakeBrowserWindow,
    appFocus: vi.fn(),
    appQuit: vi.fn(),
    setActivationPolicy: vi.fn(),
    emitEvent: vi.fn(() => true),
    onAutoArchiveTrigger: vi.fn(),
    onOpenBlockReady: vi.fn(),
    calculateWindowPosition: vi.fn(() => ({ x: 10, y: 20 })),
    saveWindowPosition: vi.fn(),
  };
});

vi.mock("electron", () => ({
  app: {
    focus: mocks.appFocus,
    quit: mocks.appQuit,
  },
  BrowserWindow: mocks.BrowserWindow,
}));

vi.mock("./position", () => ({
  calculateWindowPosition: mocks.calculateWindowPosition,
  saveWindowPosition: mocks.saveWindowPosition,
}));

import { createWindowManager } from "./manager";

function setPlatform(platform: NodeJS.Platform): () => void {
  const originalPlatform = process.platform;
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform,
  });

  return () => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: originalPlatform,
    });
  };
}

describe("window manager", () => {
  beforeEach(() => {
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");
    vi.stubGlobal("process", process);
    mocks.BrowserWindow.instances.length = 0;
    mocks.appFocus.mockReset();
    mocks.appQuit.mockReset();
    mocks.emitEvent.mockReset();
    mocks.emitEvent.mockReturnValue(true);
    mocks.onAutoArchiveTrigger.mockReset();
    mocks.onOpenBlockReady.mockReset();
    mocks.calculateWindowPosition.mockReset();
    mocks.calculateWindowPosition.mockReturnValue({ x: 10, y: 20 });
    mocks.saveWindowPosition.mockReset();
  });

  it("creates main window and wires lifecycle events", () => {
    const manager = createWindowManager({
      emitEvent: mocks.emitEvent,
      onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
      onOpenBlockReady: mocks.onOpenBlockReady,
    });

    manager.createMainWindow();
    const win = mocks.BrowserWindow.instances[0];
    expect(win).toBeDefined();

    win.emit("focus");
    win.emit("blur");
    win.emit("hide");
    win.emit("ready-to-show");
    win.emit("did-finish-load");

    expect(mocks.emitEvent).toHaveBeenCalledWith("window.focus-changed", true);
    expect(mocks.emitEvent).toHaveBeenCalledWith("window.focus-changed", false);
    expect(mocks.onAutoArchiveTrigger).toHaveBeenCalledWith(false);
    expect(mocks.onAutoArchiveTrigger).toHaveBeenCalledWith(true);
    expect(mocks.onOpenBlockReady).toHaveBeenCalled();
  });

  it("keeps the main window visible across macOS workspaces", () => {
    const restorePlatform = setPlatform("darwin");

    try {
      const manager = createWindowManager({
        emitEvent: mocks.emitEvent,
        onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
        onOpenBlockReady: mocks.onOpenBlockReady,
      });

      manager.createMainWindow();
      const win = mocks.BrowserWindow.instances[0];
      expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });

      win.visible = false;
      manager.showMainWindow();

      expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledTimes(3);
      expect(win.show).toHaveBeenCalled();
    } finally {
      restorePlatform();
    }
  });

  it("uses macOS vibrancy options for the main window", () => {
    const restorePlatform = setPlatform("darwin");

    try {
      const manager = createWindowManager({
        emitEvent: mocks.emitEvent,
        onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
        onOpenBlockReady: mocks.onOpenBlockReady,
      });

      manager.createMainWindow();
      const win = mocks.BrowserWindow.instances[0];
      const options = win.options as BrowserWindowConstructorOptions;

      expect(options.vibrancy).toBe("under-window");
      expect(options.visualEffectState).toBe("active");
      expect(options.backgroundMaterial).toBeUndefined();
    } finally {
      restorePlatform();
    }
  });

  it("uses Windows acrylic material without macOS vibrancy", () => {
    const restorePlatform = setPlatform("win32");

    try {
      const manager = createWindowManager({
        emitEvent: mocks.emitEvent,
        onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
        onOpenBlockReady: mocks.onOpenBlockReady,
      });

      manager.createMainWindow();
      const win = mocks.BrowserWindow.instances[0];
      const options = win.options as BrowserWindowConstructorOptions;

      expect(options.backgroundMaterial).toBe("acrylic");
      expect(options.vibrancy).toBeUndefined();
      expect(options.visualEffectState).toBeUndefined();
    } finally {
      restorePlatform();
    }
  });

  it("toggles and quits via manager", () => {
    const manager = createWindowManager({
      emitEvent: mocks.emitEvent,
      onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
      onOpenBlockReady: mocks.onOpenBlockReady,
    });

    manager.createMainWindow();
    const win = mocks.BrowserWindow.instances[0];
    win.visible = true;

    manager.toggleMainWindow();
    expect(mocks.saveWindowPosition).toHaveBeenCalled();

    manager.requestQuit();
    expect(mocks.appQuit).toHaveBeenCalled();
  });

  it("shows hidden/minimized window and handles close while quitting", () => {
    const manager = createWindowManager({
      emitEvent: mocks.emitEvent,
      onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
      onOpenBlockReady: mocks.onOpenBlockReady,
    });

    manager.createMainWindow();
    const win = mocks.BrowserWindow.instances[0];
    win.visible = false;
    win.minimized = true;

    manager.showMainWindow();
    expect(win.restore).toHaveBeenCalled();
    expect(win.setPosition).toHaveBeenCalledWith(10, 20);
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();

    const event = { preventDefault: vi.fn() };
    manager.prepareToQuit();
    win.emit("close", event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("loads dev server url and opens devtools in dev mode", () => {
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");
    const manager = createWindowManager({
      emitEvent: mocks.emitEvent,
      onAutoArchiveTrigger: mocks.onAutoArchiveTrigger,
      onOpenBlockReady: mocks.onOpenBlockReady,
    });

    manager.createMainWindow();
    const win = mocks.BrowserWindow.instances[0];
    expect(win.loadURL).toHaveBeenCalledWith("http://localhost:5173");
    expect(win.webContents.openDevTools).toHaveBeenCalled();
  });
});
