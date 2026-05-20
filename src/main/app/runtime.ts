import { app, globalShortcut } from "electron";

import { createIpcRouter } from "../core/ipc";
import { registerAssetProtocol } from "../features/assets/protocol";
import { extractDeepLinkFromArgv } from "../features/deep-link/handler";
import { createEntrypointRuntime } from "./entrypoints";
import { registerFeatureCommands } from "./register-commands";
import { createMainServices } from "./services";

export function createBackendRuntime() {
  const services = createMainServices();
  let entrypointRuntime: ReturnType<typeof createEntrypointRuntime> | null = null;

  function registerMainWindowToEventBus(): void {
    const mainWindow = services.windowManager.getMainWindow();
    if (mainWindow) {
      services.events.registerWindow(mainWindow);
    }
  }

  async function start(): Promise<void> {
    await services.db.init();
    const db = services.db.getDb();
    entrypointRuntime = createEntrypointRuntime({
      createExternalEditSession: (blockId, originalContent, trigger, signal) =>
        services.externalEditManager.begin(blockId, originalContent, trigger, { signal }).result,
      getDb: async () => db,
      requestOpenBlock: (blockId) => {
        services.openBlockService.requestOpen({ blockId });
      },
      showMainWindow: () => services.windowManager.showMainWindow(),
    });
    const ipc = createIpcRouter({
      isSenderTrusted: services.events.isSenderTrusted,
    });
    registerFeatureCommands(ipc, {
      autoArchiveRuntime: services.autoArchiveRuntime,
      db,
      events: services.events,
      externalEditManager: services.externalEditManager,
      now: () => new Date(),
      openBlockService: services.openBlockService,
      paths: services.paths,
      preferencesService: services.preferencesService,
      windowManager: services.windowManager,
    });

    registerAssetProtocol(services.paths);
    await entrypointRuntime.startCliServer();
    services.windowManager.createMainWindow();
    registerMainWindowToEventBus();
    services.trayManager.createTray();
    await services.autoArchiveRuntime.start();

    const startupDeepLink = extractDeepLinkFromArgv(process.argv);
    if (startupDeepLink) {
      void entrypointRuntime.handleDeepLink(startupDeepLink);
    }
  }

  async function stop(): Promise<void> {
    services.windowManager.prepareToQuit();
    services.autoArchiveRuntime.stop();
    globalShortcut.unregisterAll();
    services.trayManager.destroyTray();
    services.externalEditManager.cancelAll();
    if (entrypointRuntime) {
      await entrypointRuntime.stopCliServer();
    }
    await services.db.close();
  }

  function handleSecondInstance(argv: readonly string[]): void {
    services.windowManager.showMainWindow();
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
    if (services.windowManager.getMainWindow() === null) {
      services.windowManager.createMainWindow();
      registerMainWindowToEventBus();
      return;
    }

    services.windowManager.showMainWindow();
  }

  function quitWhenAllWindowsClosed(): void {
    if (process.platform !== "darwin") {
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
  };
}
