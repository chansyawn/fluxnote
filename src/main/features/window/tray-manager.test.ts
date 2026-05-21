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
  beforeEach(() => {
    mocks.Tray.instances.length = 0;
    mocks.MenuBuildFromTemplate.mockClear();
    mocks.createFromPath.mockClear();
    mocks.createEmpty.mockClear();
  });

  it("creates tray once and can destroy it", () => {
    const manager = createTrayManager({
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
      showMainWindow: vi.fn(),
    });

    manager.createTray();
    manager.createTray();

    expect(mocks.Tray.instances).toHaveLength(1);
    expect(mocks.MenuBuildFromTemplate).toHaveBeenCalled();

    manager.destroyTray();
    expect(mocks.Tray.instances[0].destroy).toHaveBeenCalled();
  });
});
