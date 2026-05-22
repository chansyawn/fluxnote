import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  appQuit: vi.fn(),
  createEntrypointRuntime: vi.fn(),
  createIpcRouter: vi.fn(),
  createMainServices: vi.fn(),
  extractDeepLinkFromArgv: vi.fn<(...argv: unknown[]) => string | null>(() => null),
  registerAppUpdateCommands: vi.fn(),
  registerAssetProtocol: vi.fn(),
  registerAssetsCommands: vi.fn(),
  registerBlocksCommands: vi.fn(),
  registerClipboardCommands: vi.fn(),
  registerCliCommands: vi.fn(),
  registerExternalEditCommands: vi.fn(),
  registerExternalUrlCommands: vi.fn(),
  registerOpenBlockCommands: vi.fn(),
  registerPreferencesCommands: vi.fn(),
  registerShortcutCommands: vi.fn(),
  registerTagsCommands: vi.fn(),
  registerWindowCommands: vi.fn(),
  unregisterAll: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    quit: mocks.appQuit,
  },
  globalShortcut: {
    unregisterAll: mocks.unregisterAll,
  },
}));

vi.mock("../features/assets/protocol", () => ({
  registerAssetProtocol: mocks.registerAssetProtocol,
}));
vi.mock("../features/app-update", () => ({
  registerAppUpdateCommands: mocks.registerAppUpdateCommands,
}));
vi.mock("../features/assets/command", () => ({
  registerAssetsCommands: mocks.registerAssetsCommands,
}));
vi.mock("../features/blocks/command", () => ({
  registerBlocksCommands: mocks.registerBlocksCommands,
}));
vi.mock("../features/clipboard", () => ({
  registerClipboardCommands: mocks.registerClipboardCommands,
}));
vi.mock("../features/cli/command", () => ({ registerCliCommands: mocks.registerCliCommands }));
vi.mock("../features/deep-link/handler", () => ({
  extractDeepLinkFromArgv: mocks.extractDeepLinkFromArgv,
}));
vi.mock("../features/external-edit/command", () => ({
  registerExternalEditCommands: mocks.registerExternalEditCommands,
}));
vi.mock("../features/external-url", () => ({
  registerExternalUrlCommands: mocks.registerExternalUrlCommands,
}));
vi.mock("../features/open-block/command", () => ({
  registerOpenBlockCommands: mocks.registerOpenBlockCommands,
}));
vi.mock("../features/preferences/command", () => ({
  registerPreferencesCommands: mocks.registerPreferencesCommands,
}));
vi.mock("../features/shortcut/command", () => ({
  registerShortcutCommands: mocks.registerShortcutCommands,
}));
vi.mock("../features/tags/command", () => ({ registerTagsCommands: mocks.registerTagsCommands }));
vi.mock("../features/window/command", () => ({
  registerWindowCommands: mocks.registerWindowCommands,
}));
vi.mock("../core/ipc", () => ({ createIpcRouter: mocks.createIpcRouter }));
vi.mock("./entrypoints", () => ({ createEntrypointRuntime: mocks.createEntrypointRuntime }));
vi.mock("./services", () => ({ createMainServices: mocks.createMainServices }));

import { createBackendRuntime } from "./runtime";

describe("createBackendRuntime", () => {
  const entrypointRuntime = {
    handleDeepLink: vi.fn(async () => undefined),
    startCliServer: vi.fn(async () => undefined),
    stopCliServer: vi.fn(async () => undefined),
  };
  const ipc = {
    register: vi.fn(),
  };

  const services = {
    appUpdateService: {
      start: vi.fn(),
      stop: vi.fn(),
    },
    applyThemePreference: vi.fn(),
    autoArchiveRuntime: {
      refreshState: vi.fn(async () => undefined),
      start: vi.fn(async () => undefined),
      stop: vi.fn(),
    },
    db: {
      close: vi.fn(async () => undefined),
      getDb: vi.fn(() => ({}) as never),
      init: vi.fn(async () => undefined),
    },
    events: {
      emit: vi.fn(),
      isSenderTrusted: vi.fn(() => true),
      registerWindow: vi.fn(),
    },
    externalEditManager: {
      begin: vi.fn(() => ({ result: Promise.resolve({ blockId: "b1", status: "cancelled" }) })),
      cancelAll: vi.fn(),
      listSessions: vi.fn(() => []),
    },
    openBlockService: {
      requestOpen: vi.fn(),
    },
    paths: {
      assetPathForBlock: vi.fn(),
      assetsRootPath: "/tmp",
      databasePath: "/tmp/test.sqlite3",
      userDataPath: "/tmp",
    },
    preferencesService: {
      readSettings: vi.fn(),
    },
    trayManager: {
      createTray: vi.fn(),
      destroyTray: vi.fn(),
    },
    windowManager: {
      createMainWindow: vi.fn(),
      getMainWindow: vi.fn<() => { isVisible: () => boolean } | null>(() => ({
        isVisible: vi.fn(() => true),
      })),
      prepareToQuit: vi.fn(),
      showMainWindow: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractDeepLinkFromArgv.mockReturnValue(null);
    mocks.createIpcRouter.mockReturnValue(ipc);
    mocks.createEntrypointRuntime.mockReturnValue(entrypointRuntime);
    mocks.createMainServices.mockReturnValue(services);
    services.preferencesService.readSettings.mockReturnValue({ appearance: { theme: "system" } });
    services.windowManager.getMainWindow.mockReturnValue({ isVisible: vi.fn(() => true) });
  });

  it("starts runtime and wires startup flow", async () => {
    const runtime = createBackendRuntime();

    await runtime.start();

    expect(services.db.init).toHaveBeenCalledTimes(1);
    expect(mocks.createEntrypointRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.createIpcRouter).toHaveBeenCalledTimes(1);
    expect(mocks.registerAppUpdateCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerAssetsCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerBlocksCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerClipboardCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerCliCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerExternalEditCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerExternalUrlCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerOpenBlockCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerPreferencesCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerShortcutCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerTagsCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerWindowCommands).toHaveBeenCalledTimes(1);
    expect(ipc.register).toHaveBeenCalledTimes(1);
    expect(mocks.registerAssetProtocol).toHaveBeenCalledTimes(1);
    expect(entrypointRuntime.startCliServer).toHaveBeenCalledTimes(1);
    expect(services.applyThemePreference).toHaveBeenCalledTimes(1);
    expect(services.windowManager.createMainWindow).toHaveBeenCalledTimes(1);
    expect(services.events.registerWindow).toHaveBeenCalledTimes(1);
    expect(services.trayManager.createTray).toHaveBeenCalledTimes(1);
    expect(services.autoArchiveRuntime.start).toHaveBeenCalledTimes(1);
    expect(services.appUpdateService.start).toHaveBeenCalledTimes(1);
    expect(services.db.init).toHaveBeenCalledBefore(entrypointRuntime.startCliServer);
    expect(entrypointRuntime.startCliServer).toHaveBeenCalledBefore(
      services.windowManager.createMainWindow,
    );
    expect(services.windowManager.createMainWindow).toHaveBeenCalledBefore(
      services.trayManager.createTray,
    );
    expect(services.trayManager.createTray).toHaveBeenCalledBefore(
      services.autoArchiveRuntime.start,
    );
    expect(services.autoArchiveRuntime.start).toHaveBeenCalledBefore(
      services.appUpdateService.start,
    );
  });

  it("handles startup deep link when available", async () => {
    mocks.extractDeepLinkFromArgv.mockReturnValue("flux://open/abc");
    const runtime = createBackendRuntime();

    await runtime.start();

    expect(entrypointRuntime.handleDeepLink).toHaveBeenCalledWith("flux://open/abc");
  });

  it("stops runtime and releases resources", async () => {
    const runtime = createBackendRuntime();
    await runtime.start();

    await runtime.stop();

    expect(services.windowManager.prepareToQuit).toHaveBeenCalledTimes(1);
    expect(services.appUpdateService.stop).toHaveBeenCalledTimes(1);
    expect(services.autoArchiveRuntime.stop).toHaveBeenCalledTimes(1);
    expect(mocks.unregisterAll).toHaveBeenCalledTimes(1);
    expect(services.trayManager.destroyTray).toHaveBeenCalledTimes(1);
    expect(services.externalEditManager.cancelAll).toHaveBeenCalledTimes(1);
    expect(entrypointRuntime.stopCliServer).toHaveBeenCalledTimes(1);
    expect(services.db.close).toHaveBeenCalledTimes(1);
  });

  it("forwards second-instance and open-url deep link", async () => {
    mocks.extractDeepLinkFromArgv.mockReturnValue("flux://open/def");
    const runtime = createBackendRuntime();
    await runtime.start();

    runtime.handleSecondInstance(["flux://open/def"]);
    runtime.handleOpenUrl("flux://open/xyz");

    expect(services.windowManager.showMainWindow).toHaveBeenCalled();
    expect(entrypointRuntime.handleDeepLink).toHaveBeenCalledWith("flux://open/def");
    expect(entrypointRuntime.handleDeepLink).toHaveBeenCalledWith("flux://open/xyz");
  });

  it("activates by creating window when main window is absent", () => {
    services.windowManager.getMainWindow.mockReturnValueOnce(null);
    const runtime = createBackendRuntime();

    runtime.activate();

    expect(services.windowManager.createMainWindow).toHaveBeenCalledTimes(1);
    expect(services.windowManager.showMainWindow).not.toHaveBeenCalled();
  });

  it("quits app only when not on darwin", () => {
    const runtime = createBackendRuntime();

    runtime.quitWhenAllWindowsClosed();

    if (process.platform === "darwin") {
      expect(mocks.appQuit).not.toHaveBeenCalled();
    } else {
      expect(mocks.appQuit).toHaveBeenCalledTimes(1);
    }
  });
});
