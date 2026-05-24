import { createAppDataPaths, type AppDataPaths } from "@main/core/app-data";
import {
  createDatabaseClient,
  createDbRuntime,
  migrateDatabase,
  type DbRuntime,
} from "@main/core/database";
import { createEventBus, type EventBus } from "@main/core/ipc";
import { getConfigStore } from "@main/core/persistence";
import { createAppUpdateService, type AppUpdateService } from "@main/features/app-update";
import {
  createAutoArchiveRuntime,
  type AutoArchiveRuntime,
} from "@main/features/blocks/auto-archive-runtime";
import { createExternalEditManager, type ExternalEditManager } from "@main/features/external-edit";
import { createOpenBlockService, type OpenBlockService } from "@main/features/open-block";
import { createPreferencesService, type PreferencesService } from "@main/features/preferences";
import { createTelemetryService, type TelemetryService } from "@main/features/telemetry";
import { createTrayManager, createWindowManager, type WindowManager } from "@main/features/window";
import { APP_SETTINGS_STORE_FILE, APP_TELEMETRY_STORE_FILE } from "@shared/app/app-config";
import {
  createDefaultSettings,
  resolvePreferredLocale,
  type ThemePreference,
} from "@shared/features/preferences/settings";
import { app, nativeTheme } from "electron";

type TrayManager = ReturnType<typeof createTrayManager>;

export interface MainServices {
  appUpdateService: AppUpdateService;
  applyThemePreference: (theme: ThemePreference) => void;
  autoArchiveRuntime: AutoArchiveRuntime;
  db: DbRuntime;
  events: EventBus;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  paths: AppDataPaths;
  preferencesService: PreferencesService;
  telemetryService: TelemetryService;
  trayManager: TrayManager;
  windowManager: WindowManager;
}

export function createMainServices(): MainServices {
  const userDataPath = app.getPath("userData");
  const defaultSettings = createDefaultSettings(
    resolvePreferredLocale(app.getPreferredSystemLanguages()),
  );
  const paths = createAppDataPaths({ userDataPath });
  const db = createDbRuntime({
    createDatabaseClient,
    databasePath: paths.databasePath,
    migrateDatabase,
  });
  const events = createEventBus();
  const emitEvent: EventBus["emit"] = (name, payload) => events.emit(name, payload);
  let windowManager: WindowManager;
  const appUpdateService = createAppUpdateService({
    emitEvent,
    prepareToQuitForInstall: () => windowManager.prepareToQuit(),
  });
  const applyThemePreference = (theme: ThemePreference): void => {
    nativeTheme.themeSource = theme;
  };
  const preferencesService = createPreferencesService({
    defaults: defaultSettings,
    emitEvent,
    storage: getConfigStore(userDataPath, APP_SETTINGS_STORE_FILE, defaultSettings),
  });
  const telemetryService = createTelemetryService({
    appVersion: app.getVersion(),
    emitEvent,
    env: {
      VITE_FLUXNOTES_POSTHOG_HOST: import.meta.env.VITE_FLUXNOTES_POSTHOG_HOST,
      VITE_FLUXNOTES_POSTHOG_KEY: import.meta.env.VITE_FLUXNOTES_POSTHOG_KEY,
    },
    readSettings: preferencesService.readSettings,
    storage: getConfigStore(userDataPath, APP_TELEMETRY_STORE_FILE, {}),
  });

  const externalEditManager = createExternalEditManager({ emitEvent });
  const autoArchiveRuntime = createAutoArchiveRuntime({
    emitEvent,
    getProtectedBlockIds: () => new Set(externalEditManager.listSessions().map((s) => s.blockId)),
    getWindowVisible: () => Boolean(windowManager.getMainWindow()?.isVisible()),
    getDb: () => db.getDb(),
    readSettings: preferencesService.readSettings,
  });
  const openBlockService = createOpenBlockService({
    emitEvent,
    showWindow: () => windowManager.showMainWindow(),
  });

  windowManager = createWindowManager({
    emitEvent,
    onAutoArchiveTrigger: (force) => void autoArchiveRuntime.trigger(force),
    onOpenBlockReady: () => openBlockService.emitPending(),
  });

  const trayManager = createTrayManager({
    getLocale: () => preferencesService.readSettings().appearance.locale,
    openMainWindowDevTools: () => windowManager.openMainWindowDevTools(),
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
  });

  return {
    appUpdateService,
    applyThemePreference,
    autoArchiveRuntime,
    db,
    events,
    externalEditManager,
    openBlockService,
    paths,
    preferencesService,
    telemetryService,
    trayManager,
    windowManager,
  };
}
