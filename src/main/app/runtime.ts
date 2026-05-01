import { app, globalShortcut } from "electron";

import { createIpcRouter } from "../core/ipc/create-ipc-router";
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
    await services.persistence.init();
    const db = services.db;
    entrypointRuntime = createEntrypointRuntime({
      createExternalEditSession: (blockId, originalContent, signal) =>
        services.externalEditManager.begin(blockId, originalContent, { signal }).result,
      getDb: async () => db,
      requestOpenBlock: (blockId) => {
        services.openBlockService.requestOpen(blockId);
      },
      showMainWindow: () => services.windowManager.showMainWindow(),
    });
    const ipc = createIpcRouter({
      isSenderTrusted: services.events.isSenderTrusted,
    });
    registerFeatureCommands(ipc, {
      db,
      events: services.events,
      externalEditManager: services.externalEditManager,
      now: () => new Date(),
      openBlockService: services.openBlockService,
      persistence: services.persistence,
      preferencesService: services.preferencesService,
      windowManager: services.windowManager,
    });

    registerAssetProtocol(services.persistence.paths);
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
    await services.persistence.close();
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
