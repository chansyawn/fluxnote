import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import type { ThemePreference } from "@shared/features/preferences/user-preferences";
import { app, globalShortcut } from "electron";

import { createIpcRouter } from "../core/ipc";
import type { EventBus } from "../core/ipc";
import { registerAppUpdateCommands, type AppUpdateService } from "../features/app-update";
import { registerAssetsCommands } from "../features/assets/command";
import { registerAssetProtocol } from "../features/assets/protocol";
import { registerBlocksCommands } from "../features/blocks/command";
import { registerCliCommands } from "../features/cli/command";
import { registerClipboardCommands } from "../features/clipboard";
import { extractDeepLinkFromArgv } from "../features/deep-link/handler";
import type { ExternalEditRuntime } from "../features/external-edit";
import { registerExternalEditCommands } from "../features/external-edit/command";
import { registerExternalUrlCommands } from "../features/external-url";
import type { OpenBlockService } from "../features/open-block";
import { registerOpenBlockCommands } from "../features/open-block/command";
import type { PreferencesService } from "../features/preferences";
import { registerPreferencesCommands } from "../features/preferences/command";
import { registerShortcutCommands } from "../features/shortcut/command";
import {
  registerSystemPermissionsCommands,
  type SystemPermissionsService,
} from "../features/system-permissions";
import { registerTagsCommands } from "../features/tags/command";
import type { TelemetryService } from "../features/telemetry";
import { registerTelemetryCommands } from "../features/telemetry";
import type { WindowManager } from "../features/window";
import { registerWindowCommands } from "../features/window/command";
import { createEntrypointRuntime } from "./entrypoints";
import { createMainServices } from "./services";

type EntrypointRuntime = ReturnType<typeof createEntrypointRuntime>;

interface RuntimeCommandDeps {
  appUpdateService: AppUpdateService;
  applyThemePreference: (theme: ThemePreference) => void;
  autoArchiveRuntime: {
    refreshState: () => Promise<void>;
  };
  db: AppDatabase;
  events: EventBus;
  externalEditRuntime: ExternalEditRuntime;
  now: () => Date;
  openBlockService: OpenBlockService;
  paths: AppDataPaths;
  preferencesService: PreferencesService;
  systemPermissionsService: SystemPermissionsService;
  telemetryService: TelemetryService;
  trayManager: {
    refreshMenu: () => void;
  };
  windowManager: WindowManager;
}

function registerRuntimeCommands(
  ipc: ReturnType<typeof createIpcRouter>,
  deps: RuntimeCommandDeps,
): void {
  registerAppUpdateCommands(ipc, {
    appUpdateService: deps.appUpdateService,
  });
  registerAssetsCommands(ipc, {
    db: deps.db,
    paths: deps.paths,
  });
  registerBlocksCommands(ipc, {
    db: deps.db,
    getAssetPathForBlock: deps.paths.assetPathForBlock,
    listExternalEditSessions: deps.externalEditRuntime.listSessions,
    now: deps.now,
    readUserPreferences: deps.preferencesService.readUserPreferences,
  });
  registerClipboardCommands(ipc);
  registerCliCommands(ipc);
  registerExternalEditCommands(ipc, {
    hideMainWindow: deps.windowManager.hideMainWindow,
    readUserPreferences: deps.preferencesService.readUserPreferences,
    runtime: deps.externalEditRuntime,
  });
  registerExternalUrlCommands(ipc);
  registerOpenBlockCommands(ipc, {
    openBlockService: deps.openBlockService,
  });
  registerPreferencesCommands(ipc, {
    applyThemePreference: deps.applyThemePreference,
    onAppUpdatePreferencesChanged: (preferences) =>
      deps.appUpdateService.setAutomaticChecksEnabled(preferences.appUpdate.automaticChecksEnabled),
    onAutoArchivePreferencesChanged: () => deps.autoArchiveRuntime.refreshState(),
    onLocalePreferenceChanged: () => deps.trayManager.refreshMenu(),
    onTelemetryPreferenceChanged: () => deps.telemetryService.notifyPreferenceChanged(),
    preferencesService: deps.preferencesService,
  });
  registerShortcutCommands(ipc, {
    events: deps.events,
  });
  registerSystemPermissionsCommands(ipc, {
    service: deps.systemPermissionsService,
  });
  registerTagsCommands(ipc, {
    db: deps.db,
  });
  registerTelemetryCommands(ipc, {
    telemetryService: deps.telemetryService,
  });
  registerWindowCommands(ipc, {
    windowManager: deps.windowManager,
  });
  ipc.register();
}

export function createBackendRuntime() {
  const services = createMainServices();
  let entrypointRuntime: EntrypointRuntime | null = null;

  function createEntrypoints(db: AppDatabase): EntrypointRuntime {
    return createEntrypointRuntime({
      createExternalEditSession: (blockId, trigger, signal) =>
        services.externalEditRuntime.createFileSession(blockId, trigger, signal),
      getDb: async () => db,
      requestOpenBlock: (blockId) => {
        services.openBlockService.requestOpen({ blockId });
      },
      showMainWindow: () => services.windowManager.activateMainWindow(),
      telemetryService: services.telemetryService,
    });
  }

  function registerIpcCommands(db: AppDatabase): void {
    const ipc = createIpcRouter({
      isSenderTrusted: services.events.isSenderTrusted,
    });
    registerRuntimeCommands(ipc, {
      appUpdateService: services.appUpdateService,
      applyThemePreference: services.applyThemePreference,
      autoArchiveRuntime: services.autoArchiveRuntime,
      db,
      events: services.events,
      externalEditRuntime: services.externalEditRuntime,
      now: () => new Date(),
      openBlockService: services.openBlockService,
      paths: services.paths,
      preferencesService: services.preferencesService,
      systemPermissionsService: services.systemPermissionsService,
      telemetryService: services.telemetryService,
      trayManager: services.trayManager,
      windowManager: services.windowManager,
    });
  }

  async function startEntrypoints(runtime: EntrypointRuntime): Promise<void> {
    registerAssetProtocol(services.paths);
    await runtime.startCliServer();
  }

  async function startWorkspaceServices(): Promise<void> {
    services.applyThemePreference(
      services.preferencesService.readUserPreferences().appearance.theme,
    );
    services.windowManager.createMainWindow();
    services.trayManager.createTray();
    await services.autoArchiveRuntime.start();
    services.appUpdateService.start({
      automaticChecksEnabled:
        services.preferencesService.readUserPreferences().appUpdate.automaticChecksEnabled,
    });
    services.telemetryService.captureEvent("app_started");
  }

  function handleStartupDeepLink(runtime: EntrypointRuntime): void {
    const startupDeepLink = extractDeepLinkFromArgv(process.argv);
    if (startupDeepLink) {
      void runtime.handleDeepLink(startupDeepLink);
    }
  }

  async function start(): Promise<void> {
    await services.db.init();
    const db = services.db.getDb();
    entrypointRuntime = createEntrypoints(db);
    registerIpcCommands(db);
    await startEntrypoints(entrypointRuntime);
    await startWorkspaceServices();
    handleStartupDeepLink(entrypointRuntime);
  }

  async function stop(): Promise<void> {
    services.windowManager.prepareToQuit();
    services.appUpdateService.stop();
    services.autoArchiveRuntime.stop();
    globalShortcut.unregisterAll();
    services.externalEditRuntime.cancelAll();
    services.telemetryService.shutdown();
    if (entrypointRuntime) {
      await entrypointRuntime.stopCliServer();
    }
    await services.db.close();
  }

  function handleSecondInstance(argv: readonly string[]): void {
    services.windowManager.activateMainWindow();
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink && entrypointRuntime) {
      void entrypointRuntime.handleDeepLink(deepLink);
    }
  }

  function handleOpenUrl(urlText: string): void {
    if (entrypointRuntime) {
      void entrypointRuntime.handleDeepLink(urlText);
    }
  }

  function activate(): void {
    services.windowManager.activateMainWindow();
  }

  function quitWhenAllWindowsClosed(): void {
    // macOS normally keeps accessory/menu-bar apps running without windows. During
    // explicit quit or update install, the quit intent lets the updater complete.
    if (process.platform !== "darwin" || services.windowManager.isQuitRequested()) {
      app.quit();
    }
  }

  return {
    activate,
    handleOpenUrl,
    handleSecondInstance,
    quitWhenAllWindowsClosed,
    start,
    stop,
    telemetryService: services.telemetryService,
  };
}
