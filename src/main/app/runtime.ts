import type { EventName, EventPayload } from "@shared/ipc/types";
import { app, globalShortcut } from "electron";

import { createAppContext, type AppContext } from "../app-context";
import { createEntrypointRuntime } from "../core/entrypoints/create-entrypoint-runtime";
import { createIpcRouter } from "../core/ipc/create-ipc-router";
import { registerIpc } from "../core/ipc/register-ipc";
import { BackendStore } from "../core/persistence/backend-store";
import { registerAssetProtocol } from "../features/assets/protocol";
import { AutoArchiveRuntime } from "../features/blocks/auto-archive-runtime";
import { extractDeepLinkFromArgv } from "../features/deep-link/handler";
import { createExternalEditManager } from "../features/external-edit";
import { createOpenBlockService } from "../features/open-block";
import { createPreferencesService } from "../features/preferences";
import { createTrayManager, createWindowManager } from "../features/window";

export function createBackendRuntime() {
  const backendStore = new BackendStore();
  const preferencesService = createPreferencesService();

  let appContext: AppContext | null = null;
  const emitEvent = <T extends EventName>(name: T, payload: EventPayload<T>): boolean => {
    return appContext ? appContext.events.emit(name, payload) : false;
  };

  let windowManager: ReturnType<typeof createWindowManager>;

  const externalEditManager = createExternalEditManager({ emitEvent });
  const autoArchiveRuntime = new AutoArchiveRuntime({
    emitEvent,
    getProtectedBlockIds: () => new Set(externalEditManager.listSessions().map((s) => s.blockId)),
    getWindowVisible: () => Boolean(windowManager.getMainWindow()?.isVisible()),
    readAutoArchiveSettings: preferencesService.readAutoArchiveSettings,
    store: backendStore,
  });
  const openBlockService = createOpenBlockService({
    emitEvent,
    showWindow: () => windowManager.showMainWindow(),
  });

  const entrypointRuntime = createEntrypointRuntime({
    createExternalEditSession: (blockId, originalContent, signal) =>
      externalEditManager.begin(blockId, originalContent, { signal }).result,
    getDb: async () => {
      await backendStore.init();
      return backendStore.getDb();
    },
    requestOpenBlock: (blockId) => {
      openBlockService.requestOpen(blockId);
    },
    showMainWindow: () => windowManager.showMainWindow(),
  });

  windowManager = createWindowManager({
    emitEvent,
    onAutoArchiveTrigger: (force) => void autoArchiveRuntime.trigger(force),
    onOpenBlockReady: () => openBlockService.emitPending(),
  });

  appContext = createAppContext({
    externalEditManager,
    openBlockService,
    preferencesService,
    store: backendStore,
    windowManager,
  });

  const ipc = createIpcRouter(appContext);
  registerIpc(ipc);

  const trayManager = createTrayManager({
    openMainWindowDevTools: () => windowManager.openMainWindowDevTools(),
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
  });

  function registerMainWindowToEventBus(): void {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && appContext) {
      appContext.events.registerWindow(mainWindow);
    }
  }

  async function start(): Promise<void> {
    await backendStore.init();
    registerAssetProtocol(backendStore);
    await entrypointRuntime.startCliServer();
    windowManager.createMainWindow();
    registerMainWindowToEventBus();
    trayManager.createTray();
    await autoArchiveRuntime.start();

    const startupDeepLink = extractDeepLinkFromArgv(process.argv);
    if (startupDeepLink) {
      void entrypointRuntime.handleDeepLink(startupDeepLink);
    }
  }

  async function stop(): Promise<void> {
    windowManager.prepareToQuit();
    autoArchiveRuntime.stop();
    globalShortcut.unregisterAll();
    trayManager.destroyTray();
    externalEditManager.cancelAll();
    await entrypointRuntime.stopCliServer();
    await backendStore.close();
  }

  function handleSecondInstance(argv: readonly string[]): void {
    windowManager.showMainWindow();
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) {
      void entrypointRuntime.handleDeepLink(deepLink);
    }
  }

  function handleOpenUrl(urlText: string): void {
    void entrypointRuntime.handleDeepLink(urlText);
  }

  function activate(): void {
    if (windowManager.getMainWindow() === null) {
      windowManager.createMainWindow();
      registerMainWindowToEventBus();
      return;
    }

    windowManager.showMainWindow();
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
