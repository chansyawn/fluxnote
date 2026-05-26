import { APP_SETTINGS_STORE_FILE } from "@shared/app/app-config";
import { createDefaultSettings } from "@shared/features/preferences/settings";
import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

type TelemetryEventEmitter = (name: "telemetry.changed", payload: TelemetryBootstrap) => boolean;

const mocks = vi.hoisted(() => ({
  appGetPath: vi.fn(() => "/mock/user-data"),
  appGetPreferredSystemLanguages: vi.fn(() => ["zh-CN", "en-US"]),
  appGetVersion: vi.fn(() => "1.0.0"),
  createAppLifecycle: vi.fn(() => ({
    prepareToQuit: vi.fn(),
    shouldQuitWhenAllWindowsClosed: vi.fn(),
  })),
  createAppDataPaths: vi.fn(() => ({
    assetPathForBlock: vi.fn(),
    assetsRootPath: "/mock/user-data/assets",
    databasePath: "/mock/user-data/app.sqlite3",
    userDataPath: "/mock/user-data",
  })),
  createAppUpdateService: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  createAutoArchiveRuntime: vi.fn(() => ({
    refreshState: vi.fn(async () => undefined),
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    trigger: vi.fn(async () => undefined),
  })),
  createDatabaseClient: vi.fn(),
  createDbRuntime: vi.fn(() => ({
    close: vi.fn(async () => undefined),
    getDb: vi.fn(),
    init: vi.fn(async () => undefined),
  })),
  createEventBus: vi.fn(() => ({
    emit: vi.fn(),
    isSenderTrusted: vi.fn(() => true),
    registerWindow: vi.fn(),
  })),
  createExternalEditManager: vi.fn(() => ({
    begin: vi.fn(),
    cancelAll: vi.fn(),
    listSessions: vi.fn(() => []),
  })),
  createOpenBlockService: vi.fn(() => ({
    emitPending: vi.fn(),
    requestOpen: vi.fn(),
  })),
  createPreferencesService: vi.fn(() => ({ readSettings: vi.fn() })),
  createTelemetryService: vi.fn((_options: { emitEvent: TelemetryEventEmitter }) => ({
    captureError: vi.fn(),
    captureEvent: vi.fn(),
    getBootstrap: vi.fn(),
    notifyPreferenceChanged: vi.fn(),
    shutdown: vi.fn(),
  })),
  createTrayManager: vi.fn(() => ({
    createTray: vi.fn(),
    destroyTray: vi.fn(),
    refreshMenu: vi.fn(),
  })),
  createWindowManager: vi.fn(() => ({
    createMainWindow: vi.fn(),
    createOrShowMainWindow: vi.fn(),
    getMainWindow: vi.fn(() => null),
    openMainWindowDevTools: vi.fn(),
    prepareToQuit: vi.fn(),
    requestQuit: vi.fn(),
    showMainWindow: vi.fn(),
  })),
  getConfigStore: vi.fn(() => ({ store: {} })),
  migrateDatabase: vi.fn(),
  nativeTheme: {
    themeSource: "system",
  },
}));

vi.mock("electron", () => ({
  app: {
    getPath: mocks.appGetPath,
    getPreferredSystemLanguages: mocks.appGetPreferredSystemLanguages,
    getVersion: mocks.appGetVersion,
  },
  nativeTheme: mocks.nativeTheme,
}));

vi.mock("@main/core/app-data", () => ({
  createAppDataPaths: mocks.createAppDataPaths,
}));
vi.mock("@main/core/database", () => ({
  createDatabaseClient: mocks.createDatabaseClient,
  createDbRuntime: mocks.createDbRuntime,
  migrateDatabase: mocks.migrateDatabase,
}));
vi.mock("@main/core/ipc", () => ({
  createEventBus: mocks.createEventBus,
}));
vi.mock("@main/core/persistence", () => ({
  getConfigStore: mocks.getConfigStore,
}));
vi.mock("@main/features/app-update", () => ({
  createAppUpdateService: mocks.createAppUpdateService,
}));
vi.mock("@main/features/blocks/auto-archive-runtime", () => ({
  createAutoArchiveRuntime: mocks.createAutoArchiveRuntime,
}));
vi.mock("@main/features/external-edit", () => ({
  createExternalEditManager: mocks.createExternalEditManager,
}));
vi.mock("@main/features/open-block", () => ({
  createOpenBlockService: mocks.createOpenBlockService,
}));
vi.mock("@main/features/preferences", () => ({
  createPreferencesService: mocks.createPreferencesService,
}));
vi.mock("@main/features/telemetry", () => ({
  createTelemetryService: mocks.createTelemetryService,
}));
vi.mock("@main/features/window", () => ({
  createTrayManager: mocks.createTrayManager,
  createWindowManager: mocks.createWindowManager,
}));
vi.mock("./lifecycle", () => ({
  createAppLifecycle: mocks.createAppLifecycle,
}));

import { createMainServices } from "./services";

describe("createMainServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appGetPreferredSystemLanguages.mockReturnValue(["zh-CN", "en-US"]);
  });

  it("initializes preferences defaults from preferred system languages", () => {
    const defaults = createDefaultSettings("zh-Hans");

    createMainServices();

    expect(mocks.appGetPreferredSystemLanguages).toHaveBeenCalledTimes(1);
    expect(mocks.getConfigStore).toHaveBeenCalledWith(
      "/mock/user-data",
      APP_SETTINGS_STORE_FILE,
      defaults,
    );
    expect(mocks.createPreferencesService).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults,
        storage: { store: {} },
      }),
    );
  });

  it("passes the app event emitter to telemetry service", () => {
    createMainServices();
    const events = mocks.createEventBus.mock.results[0]?.value as {
      emit: ReturnType<typeof vi.fn>;
    };
    const createTelemetryCall = mocks.createTelemetryService.mock.calls[0]![0];
    const bootstrap = {
      anonId: "anon-1",
      appVersion: "1.0.0",
      enabled: false,
      posthogHost: null,
      posthogKey: null,
    } satisfies TelemetryBootstrap;

    createTelemetryCall.emitEvent("telemetry.changed", bootstrap);

    expect(events.emit).toHaveBeenCalledWith("telemetry.changed", bootstrap);
  });

  it("prepares lifecycle and windows before installing an app update", () => {
    createMainServices();
    const appLifecycle = mocks.createAppLifecycle.mock.results[0]?.value as {
      prepareToQuit: ReturnType<typeof vi.fn>;
    };
    const windowManager = mocks.createWindowManager.mock.results[0]?.value as {
      prepareToQuit: ReturnType<typeof vi.fn>;
    };
    const [createAppUpdateCall] = mocks.createAppUpdateService.mock.calls[0] as unknown as [
      { prepareToQuitForInstall: () => void },
    ];

    createAppUpdateCall.prepareToQuitForInstall();

    expect(appLifecycle.prepareToQuit).toHaveBeenCalledWith("app-update-install");
    expect(windowManager.prepareToQuit).toHaveBeenCalledTimes(1);
  });

  it("uses create-or-show when the tray opens the main window", () => {
    createMainServices();
    const windowManager = mocks.createWindowManager.mock.results[0]?.value as {
      createOrShowMainWindow: ReturnType<typeof vi.fn>;
    };
    const [createTrayCall] = mocks.createTrayManager.mock.calls[0] as unknown as [
      { showMainWindow: () => void },
    ];

    createTrayCall.showMainWindow();

    expect(windowManager.createOrShowMainWindow).toHaveBeenCalledTimes(1);
  });

  it("uses create-or-show when opening a block asks for the main window", () => {
    createMainServices();
    const windowManager = mocks.createWindowManager.mock.results[0]?.value as {
      createOrShowMainWindow: ReturnType<typeof vi.fn>;
    };
    const [createOpenBlockCall] = mocks.createOpenBlockService.mock.calls[0] as unknown as [
      { showWindow: () => void },
    ];

    createOpenBlockCall.showWindow();

    expect(windowManager.createOrShowMainWindow).toHaveBeenCalledTimes(1);
  });

  it("registers each created main window to the event bus", () => {
    createMainServices();
    const events = mocks.createEventBus.mock.results[0]?.value as {
      registerWindow: ReturnType<typeof vi.fn>;
    };
    const [createWindowCall] = mocks.createWindowManager.mock.calls[0] as unknown as [
      { onMainWindowCreated: (window: unknown) => void },
    ];
    const window = {};

    createWindowCall.onMainWindowCreated(window);

    expect(events.registerWindow).toHaveBeenCalledWith(window);
  });
});
