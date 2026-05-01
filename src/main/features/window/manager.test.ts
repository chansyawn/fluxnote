import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const electronMock = vi.hoisted(() => {
  const openDevTools = vi.fn();
  const webContentsOn = vi.fn();
  const loadURL = vi.fn();
  const loadFile = vi.fn();

  class BrowserWindowMock {
    public webContents = {
      on: webContentsOn,
      openDevTools,
    };

    public constructor(_options: unknown) {}

    public destroy = vi.fn();
    public focus = vi.fn();
    public hide = vi.fn();
    public isDestroyed = vi.fn(() => false);
    public isMinimized = vi.fn(() => false);
    public isVisible = vi.fn(() => true);
    public loadFile = loadFile;
    public loadURL = loadURL;
    public on = vi.fn();
    public once = vi.fn();
    public restore = vi.fn();
    public setPosition = vi.fn();
    public setVisibleOnAllWorkspaces = vi.fn();
    public show = vi.fn();
  }

  return {
    BrowserWindow: BrowserWindowMock,
    app: { focus: vi.fn(), quit: vi.fn() },
    loadFile,
    loadURL,
    openDevTools,
    webContentsOn,
  };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow,
  app: electronMock.app,
}));

import { createWindowManager } from "./manager";

describe("window manager devtools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");
  });

  it("no-ops when main window does not exist", () => {
    const manager = createWindowManager({
      emitEvent: vi.fn(() => true),
      onAutoArchiveTrigger: vi.fn(),
      onOpenBlockReady: vi.fn(),
    });

    expect(() => manager.openMainWindowDevTools()).not.toThrow();
    expect(electronMock.openDevTools).not.toHaveBeenCalled();
  });

  it("opens devtools for existing main window", () => {
    const manager = createWindowManager({
      emitEvent: vi.fn(() => true),
      onAutoArchiveTrigger: vi.fn(),
      onOpenBlockReady: vi.fn(),
    });

    manager.createMainWindow();
    manager.openMainWindowDevTools();

    expect(electronMock.openDevTools).toHaveBeenCalledWith({ mode: "detach" });
  });
});

describe("window manager visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");
  });

  it("focuses app and window when showing an existing window on macOS", () => {
    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("darwin");

    const manager = createWindowManager({
      emitEvent: vi.fn(() => true),
      onAutoArchiveTrigger: vi.fn(),
      onOpenBlockReady: vi.fn(),
    });
    manager.createMainWindow();

    const mainWindow = manager.getMainWindow();
    expect(mainWindow).not.toBeNull();
    const focusSpy = vi.spyOn(mainWindow!, "focus");
    manager.showMainWindow();

    expect(electronMock.app.focus).toHaveBeenCalledWith({ steal: true });
    expect(focusSpy).toHaveBeenCalledTimes(1);
    platformSpy.mockRestore();
  });
});
