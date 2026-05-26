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
  registerTelemetryCommands: vi.fn(),
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
vi.mock("../features/telemetry", () => ({
  registerTelemetryCommands: mocks.registerTelemetryCommands,
}));
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
    appLifecycle: {
      prepareToQuit: vi.fn(),
      shouldQuitWhenAllWindowsClosed: vi.fn(() => false),
    },
    appUpdateService: {
      setAutomaticChecksEnabled: vi.fn(),
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
    telemetryService: {
      captureEvent: vi.fn(),
      notifyPreferenceChanged: vi.fn(),
      shutdown: vi.fn(),
    },
    trayManager: {
      createTray: vi.fn(),
      destroyTray: vi.fn(),
      refreshMenu: vi.fn(),
    },
    windowManager: {
      createMainWindow: vi.fn(),
      createOrShowMainWindow: vi.fn(),
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
    services.appLifecycle.shouldQuitWhenAllWindowsClosed.mockReturnValue(false);
    services.preferencesService.readSettings.mockReturnValue({
      appUpdate: { automaticChecksEnabled: true },
      appearance: { theme: "system" },
    });
    services.windowManager.getMainWindow.mockReturnValue({ isVisible: vi.fn(() => true) });
  });

  it("starts runtime and wires startup flow", async () => {
    const runtime = createBackendRuntime();

    expect(mocks.createMainServices).toHaveBeenCalledTimes(1);

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
    expect(mocks.registerPreferencesCommands).toHaveBeenCalledWith(
      ipc,
      expect.objectContaining({
        onLocalePreferenceChanged: expect.any(Function),
      }),
    );
    expect(mocks.registerShortcutCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerTagsCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerTelemetryCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerWindowCommands).toHaveBeenCalledTimes(1);
    expect(ipc.register).toHaveBeenCalledTimes(1);
    expect(mocks.registerAssetProtocol).toHaveBeenCalledTimes(1);
    expect(entrypointRuntime.startCliServer).toHaveBeenCalledTimes(1);
    expect(services.applyThemePreference).toHaveBeenCalledTimes(1);
    expect(services.windowManager.createMainWindow).toHaveBeenCalledTimes(1);
    expect(services.events.registerWindow).not.toHaveBeenCalled();
    expect(services.trayManager.createTray).toHaveBeenCalledTimes(1);
    expect(services.autoArchiveRuntime.start).toHaveBeenCalledTimes(1);
    expect(services.appUpdateService.start).toHaveBeenCalledTimes(1);
    expect(services.appUpdateService.start).toHaveBeenCalledWith({
      automaticChecksEnabled: true,
    });
    expect(services.telemetryService.captureEvent).toHaveBeenCalledWith("app_started");
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

  it("refreshes tray menu after locale preferences change", async () => {
    const runtime = createBackendRuntime();
    await runtime.start();
    const registerCall = mocks.registerPreferencesCommands.mock.calls[0];
    const deps = registerCall?.[1] as { onLocalePreferenceChanged: () => void };

    deps.onLocalePreferenceChanged();

    expect(services.trayManager.refreshMenu).toHaveBeenCalledTimes(1);
  });

  it("notifies telemetry after telemetry preferences change", async () => {
    const runtime = createBackendRuntime();
    await runtime.start();
    const registerCall = mocks.registerPreferencesCommands.mock.calls[0];
    const deps = registerCall?.[1] as { onTelemetryPreferenceChanged: () => void };

    deps.onTelemetryPreferenceChanged();

    expect(services.telemetryService.notifyPreferenceChanged).toHaveBeenCalledTimes(1);
  });

  it("updates automatic app update checks after preferences change", async () => {
    const runtime = createBackendRuntime();
    await runtime.start();
    const registerCall = mocks.registerPreferencesCommands.mock.calls[0];
    const deps = registerCall?.[1] as {
      onAppUpdatePreferencesChanged: (settings: {
        appUpdate: { automaticChecksEnabled: boolean };
      }) => void;
    };

    deps.onAppUpdatePreferencesChanged({ appUpdate: { automaticChecksEnabled: false } });

    expect(services.appUpdateService.setAutomaticChecksEnabled).toHaveBeenCalledWith(false);
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
    expect(services.telemetryService.shutdown).toHaveBeenCalledTimes(1);
    expect(entrypointRuntime.stopCliServer).toHaveBeenCalledTimes(1);
    expect(services.db.close).toHaveBeenCalledTimes(1);
  });

  it("forwards second-instance and open-url deep link", async () => {
    mocks.extractDeepLinkFromArgv.mockReturnValue("flux://open/def");
    const runtime = createBackendRuntime();
    await runtime.start();

    runtime.handleSecondInstance(["flux://open/def"]);
    runtime.handleOpenUrl("flux://open/xyz");

    expect(services.windowManager.createOrShowMainWindow).toHaveBeenCalled();
    expect(entrypointRuntime.handleDeepLink).toHaveBeenCalledWith("flux://open/def");
    expect(entrypointRuntime.handleDeepLink).toHaveBeenCalledWith("flux://open/xyz");
  });

  it("activates by creating or showing the main window", () => {
    const runtime = createBackendRuntime();

    runtime.activate();

    expect(services.windowManager.createOrShowMainWindow).toHaveBeenCalledTimes(1);
    expect(services.windowManager.createMainWindow).not.toHaveBeenCalled();
    expect(services.windowManager.showMainWindow).not.toHaveBeenCalled();
  });

  it("keeps app running when the lifecycle keeps all-window-close open", () => {
    const runtime = createBackendRuntime();

    runtime.quitWhenAllWindowsClosed();

    expect(services.appLifecycle.shouldQuitWhenAllWindowsClosed).toHaveBeenCalledTimes(1);
    expect(mocks.appQuit).not.toHaveBeenCalled();
  });

  it("quits app when the lifecycle treats all-window-close as a quit", () => {
    services.appLifecycle.shouldQuitWhenAllWindowsClosed.mockReturnValue(true);
    const runtime = createBackendRuntime();

    runtime.quitWhenAllWindowsClosed();

    expect(mocks.appQuit).toHaveBeenCalledTimes(1);
  });
});
