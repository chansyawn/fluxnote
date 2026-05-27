import type { LocaleCode } from "@shared/features/preferences/settings";
import type { MenuItemConstructorOptions } from "electron";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");

type FakeTrayEventHandler = (...args: unknown[]) => void;

const mocks = vi.hoisted(() => {
  const trayInstances: FakeTray[] = [];

  class FakeImage {
    empty: boolean;
    constructor(empty = false) {
      this.empty = empty;
    }
    isEmpty() {
      return this.empty;
    }
    setTemplateImage() {}
  }

  class FakeTray {
    static instances = trayInstances;
    argumentCount: number;
    guid: string | undefined;
    handlers = new Map<string, FakeTrayEventHandler[]>();
    icon: unknown;
    setToolTip = vi.fn();
    setContextMenu = vi.fn();
    popUpContextMenu = vi.fn();
    destroy = vi.fn();
    on = vi.fn((event: string, handler: FakeTrayEventHandler) => {
      const handlers = this.handlers.get(event) ?? [];
      handlers.push(handler);
      this.handlers.set(event, handlers);
      return this;
    });
    constructor(...args: [icon: unknown, guid?: string]) {
      this.argumentCount = args.length;
      this.icon = args[0];
      this.guid = args[1];
      trayInstances.push(this);
    }
    emit(event: string, ...args: unknown[]) {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(...args);
      }
    }
  }

  return {
    MenuBuildFromTemplate: vi.fn((template) => template),
    appIsPackaged: false,
    createFromPath: vi.fn(() => new FakeImage(false)),
    createEmpty: vi.fn(() => new FakeImage(true)),
    Tray: FakeTray,
  };
});

vi.mock("electron", () => ({
  app: { isPackaged: mocks.appIsPackaged },
  Menu: { buildFromTemplate: mocks.MenuBuildFromTemplate },
  nativeImage: {
    createEmpty: mocks.createEmpty,
    createFromPath: mocks.createFromPath,
  },
  Tray: mocks.Tray,
}));

import { createTrayManager } from "./tray-manager";

const TRAY_GUID = "0b22f1d9-6bfc-52e0-8abd-739669015441";

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

describe("tray manager", () => {
  let locale: LocaleCode;

  beforeEach(() => {
    locale = "en";
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");
    mocks.Tray.instances.length = 0;
    mocks.MenuBuildFromTemplate.mockClear();
    mocks.createFromPath.mockClear();
    mocks.createEmpty.mockClear();
  });

  it("creates tray once and can destroy it", () => {
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();
    manager.createTray();

    expect(mocks.Tray.instances).toHaveLength(1);
    expect(mocks.MenuBuildFromTemplate).toHaveBeenCalled();

    manager.destroyTray();
    expect(mocks.Tray.instances[0].destroy).toHaveBeenCalled();
  });

  it("passes a stable tray guid on macOS", () => {
    const restorePlatform = setPlatform("darwin");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();

      expect(mocks.Tray.instances[0].argumentCount).toBe(2);
      expect(mocks.Tray.instances[0].guid).toBe(TRAY_GUID);
    } finally {
      restorePlatform();
    }
  });

  it("passes a stable tray guid on Windows", () => {
    const restorePlatform = setPlatform("win32");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();

      expect(mocks.Tray.instances[0].argumentCount).toBe(2);
      expect(mocks.Tray.instances[0].guid).toBe(TRAY_GUID);
    } finally {
      restorePlatform();
    }
  });

  it("does not pass a tray guid on Linux", () => {
    const restorePlatform = setPlatform("linux");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();

      expect(mocks.Tray.instances[0].argumentCount).toBe(1);
      expect(mocks.Tray.instances[0].guid).toBeUndefined();
    } finally {
      restorePlatform();
    }
  });

  it("uses English tray menu labels by default", () => {
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();

    expect(mocks.MenuBuildFromTemplate).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: "Show Fluxnotes" }),
      { type: "separator" },
      expect.objectContaining({ label: "Quit" }),
    ]);
  });

  it("activates the main window from the show menu item", () => {
    const activateMainWindow = vi.fn();
    const manager = createTrayManager({
      activateMainWindow,
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();
    const menuTemplate = mocks.MenuBuildFromTemplate.mock.calls[0]?.[0] as
      | MenuItemConstructorOptions[]
      | undefined;

    menuTemplate?.[0]?.click?.({} as never, undefined, {} as never);

    expect(activateMainWindow).toHaveBeenCalledOnce();
  });

  it("activates the main window from a tray left click", () => {
    const activateMainWindow = vi.fn();
    const manager = createTrayManager({
      activateMainWindow,
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();
    const tray = mocks.Tray.instances[0];
    tray.emit("click");

    expect(activateMainWindow).toHaveBeenCalledOnce();
    expect(tray.popUpContextMenu).not.toHaveBeenCalled();
  });

  it("uses Simplified Chinese tray menu labels", () => {
    locale = "zh-Hans";
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();

    expect(mocks.MenuBuildFromTemplate).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: "打开 Fluxnotes" }),
      { type: "separator" },
      expect.objectContaining({ label: "退出" }),
    ]);
  });

  it("falls back to English tray labels for pseudo locale", () => {
    locale = "pseudo";
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();

    expect(mocks.MenuBuildFromTemplate).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: "Show Fluxnotes" }),
      { type: "separator" },
      expect.objectContaining({ label: "Quit" }),
    ]);
  });

  it("opens the tray menu from right click on macOS without an explicit position", () => {
    const restorePlatform = setPlatform("darwin");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();
      const tray = mocks.Tray.instances[0];
      const builtMenu = mocks.MenuBuildFromTemplate.mock.results[0]?.value;
      tray.emit("right-click", {}, { height: 24, width: 24, x: 100, y: 200 });

      expect(tray.popUpContextMenu).toHaveBeenCalledWith(builtMenu, undefined);
      expect(tray.setContextMenu).not.toHaveBeenCalled();
    } finally {
      restorePlatform();
    }
  });

  it("opens the tray menu from right click beside the tray icon on Windows", () => {
    const restorePlatform = setPlatform("win32");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();
      const tray = mocks.Tray.instances[0];
      const builtMenu = mocks.MenuBuildFromTemplate.mock.results[0]?.value;
      tray.emit("right-click", {}, { height: 24, width: 24, x: 100, y: 200 });

      expect(tray.popUpContextMenu).toHaveBeenCalledWith(builtMenu, { x: 100, y: 200 });
      expect(tray.setContextMenu).not.toHaveBeenCalled();
    } finally {
      restorePlatform();
    }
  });

  it("uses the native context menu fallback on Linux", () => {
    const restorePlatform = setPlatform("linux");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();
      const tray = mocks.Tray.instances[0];
      const builtMenu = mocks.MenuBuildFromTemplate.mock.results[0]?.value;
      tray.emit("right-click");

      expect(tray.setContextMenu).toHaveBeenCalledWith(builtMenu);
      expect(tray.popUpContextMenu).not.toHaveBeenCalled();
    } finally {
      restorePlatform();
    }
  });

  it("translates the DevTools menu item in development", () => {
    locale = "zh-Hans";
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();

    expect(mocks.MenuBuildFromTemplate).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: "打开 Fluxnotes" }),
      expect.objectContaining({ label: "打开开发者工具" }),
      { type: "separator" },
      expect.objectContaining({ label: "退出" }),
    ]);
  });

  it("opens the refreshed menu after locale changes", () => {
    const restorePlatform = setPlatform("win32");
    try {
      const manager = createTrayManager({
        activateMainWindow: vi.fn(),
        getLocale: () => locale,
        openMainWindowDevTools: vi.fn(),
        requestQuit: vi.fn(),
      });

      manager.createTray();
      locale = "zh-Hans";
      manager.refreshMenu();
      const tray = mocks.Tray.instances[0];
      const builtMenus = mocks.MenuBuildFromTemplate.mock.results;
      const refreshedMenu = builtMenus[builtMenus.length - 1]?.value;
      tray.emit("right-click", {}, { height: 24, width: 24, x: 100, y: 200 });

      expect(tray.popUpContextMenu).toHaveBeenCalledWith(refreshedMenu, { x: 100, y: 200 });
      expect(mocks.MenuBuildFromTemplate).toHaveBeenLastCalledWith([
        expect.objectContaining({ label: "打开 Fluxnotes" }),
        { type: "separator" },
        expect.objectContaining({ label: "退出" }),
      ]);
    } finally {
      restorePlatform();
    }
  });

  it("ignores refresh before tray is created", () => {
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.refreshMenu();

    expect(mocks.Tray.instances).toHaveLength(0);
    expect(mocks.MenuBuildFromTemplate).not.toHaveBeenCalled();
  });
});
