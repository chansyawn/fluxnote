import { APP_SETTINGS_STORE_FILE } from "@shared/app/app-config";
import { createDefaultUserPreferences } from "@shared/features/preferences/user-preferences";
import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

type TelemetryEventEmitter = (name: "telemetry.changed", payload: TelemetryBootstrap) => boolean;
type CreateWindowManagerOptions = {
  onMainWindowCreated: (window: never) => void;
};
type CreateTrayManagerOptions = {
  activateMainWindow: () => void;
};
type CreateOpenBlockServiceOptions = {
  showWindow: () => void;
};

const mocks = vi.hoisted(() => ({
  appGetPath: vi.fn(() => "/mock/user-data"),
  appGetPreferredSystemLanguages: vi.fn(() => ["zh-CN", "en-US"]),
  appGetVersion: vi.fn(() => "1.0.0"),
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
  createPreferencesService: vi.fn(() => ({ readUserPreferences: vi.fn() })),
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
    activateMainWindow: vi.fn(),
    createMainWindow: vi.fn(),
    getMainWindow: vi.fn(() => null),
    hideMainWindow: vi.fn(),
    isQuitRequested: vi.fn(() => false),
    openMainWindowDevTools: vi.fn(),
    prepareToQuit: vi.fn(),
    requestQuit: vi.fn(),
    restartApp: vi.fn(),
    showMainWindow: vi.fn(),
    toggleMainWindow: vi.fn(),
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

import { createMainServices } from "./services";

describe("createMainServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appGetPreferredSystemLanguages.mockReturnValue(["zh-CN", "en-US"]);
  });

  it("initializes preferences defaults from preferred system languages", () => {
    const defaults = createDefaultUserPreferences("zh-Hans");

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

  it("registers newly created main windows with the app event bus", () => {
    createMainServices();
    const events = mocks.createEventBus.mock.results[0]?.value as {
      registerWindow: ReturnType<typeof vi.fn>;
    };
    const createWindowCall = (
      mocks.createWindowManager.mock.calls as unknown as [CreateWindowManagerOptions][]
    )[0]?.[0];
    const window = {};
    if (!createWindowCall) {
      throw new Error("Window manager was not created.");
    }

    createWindowCall.onMainWindowCreated(window as never);

    expect(events.registerWindow).toHaveBeenCalledWith(window);
  });

  it("uses main window activation for tray and open-block window requests", () => {
    const services = createMainServices();
    const createTrayCall = (
      mocks.createTrayManager.mock.calls as unknown as [CreateTrayManagerOptions][]
    )[0]?.[0];
    const createOpenBlockCall = (
      mocks.createOpenBlockService.mock.calls as unknown as [CreateOpenBlockServiceOptions][]
    )[0]?.[0];
    if (!createTrayCall || !createOpenBlockCall) {
      throw new Error("Window activation dependencies were not created.");
    }

    createTrayCall.activateMainWindow();
    createOpenBlockCall.showWindow();

    expect(services.windowManager.activateMainWindow).toHaveBeenCalledTimes(2);
  });
});
