import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const electronMock = vi.hoisted(() => {
  const setTemplateImage = vi.fn();
  const isEmpty = vi.fn(() => false);
  const createFromPath = vi.fn(() => ({ isEmpty, setTemplateImage }));
  const buildFromTemplate = vi.fn((template) => template);
  const setToolTip = vi.fn();
  const setContextMenu = vi.fn();
  const on = vi.fn();
  const destroy = vi.fn();

  class TrayMock {
    public constructor(_icon: unknown) {}

    public destroy = destroy;
    public on = on;
    public setContextMenu = setContextMenu;
    public setToolTip = setToolTip;
  }

  return {
    Tray: TrayMock,
    app: { isPackaged: false },
    buildFromTemplate,
    createFromPath,
    destroy,
    isEmpty,
    nativeImage: {
      createEmpty: vi.fn(() => ({})),
      createFromPath,
    },
    on,
    setContextMenu,
    setTemplateImage,
    setToolTip,
  };
});

vi.mock("electron", () => ({
  Menu: {
    buildFromTemplate: electronMock.buildFromTemplate,
  },
  Tray: electronMock.Tray,
  app: electronMock.app,
  nativeImage: electronMock.nativeImage,
}));

import { createTrayManager } from "./tray-manager";

describe("tray manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds Open DevTools in dev mode", () => {
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");
    const manager = createTrayManager({
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
      showMainWindow: vi.fn(),
    });

    manager.createTray();

    const template = electronMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
    }>;
    expect(template.map((item) => item.label).filter(Boolean)).toContain("Open DevTools");
    expect(electronMock.on).not.toHaveBeenCalled();
  });

  it("hides Open DevTools outside dev mode", () => {
    vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", undefined);
    const manager = createTrayManager({
      openMainWindowDevTools: vi.fn(),
      requestQuit: vi.fn(),
      showMainWindow: vi.fn(),
    });

    manager.createTray();

    const template = electronMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
    }>;
    expect(template.map((item) => item.label).filter(Boolean)).not.toContain("Open DevTools");
    expect(electronMock.on).not.toHaveBeenCalled();
  });
});
