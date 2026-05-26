import type { LocaleCode } from "@shared/features/preferences/settings";
import type { MenuItemConstructorOptions } from "electron";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");

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
    setToolTip = vi.fn();
    setContextMenu = vi.fn();
    destroy = vi.fn();
    constructor(_icon: unknown) {
      trayInstances.push(this);
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

  it("refreshes menu labels after locale changes", () => {
    const manager = createTrayManager({
      activateMainWindow: vi.fn(),
      getLocale: () => locale,
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
    });

    manager.createTray();
    locale = "zh-Hans";
    manager.refreshMenu();

    expect(mocks.Tray.instances[0].setContextMenu).toHaveBeenCalledTimes(2);
    expect(mocks.MenuBuildFromTemplate).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: "打开 Fluxnotes" }),
      { type: "separator" },
      expect.objectContaining({ label: "退出" }),
    ]);
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
