import { app, globalShortcut } from "electron";

import { createEmitIpcEvent } from "../core/ipc/emit-ipc-event";
import { BackendStore } from "../core/persistence/backend-store";
import { registerAssetProtocol } from "../features/assets/asset-protocol";
import { AutoArchiveRuntime } from "../features/blocks/auto-archive-runtime";
import { createCliIpcServer } from "../features/cli/cli-ipc-server";
import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
} from "../features/deep-link/deep-link-handler";
import { createExternalEditManager } from "../features/external-edit";
import { createOpenBlockService } from "../features/open-block";
import { getConfigStore } from "../features/preferences";
import { createTrayManager, createWindowManager } from "../features/window";
import { createBackendCommandDispatcher } from "./backend-commands";
import { registerIpcCommands } from "./ipc-registry";

const SETTINGS_STORE_NAME = "settings.json";

export function createBackendRuntime() {
  const backendStore = new BackendStore();
  const settingsStore = getConfigStore(SETTINGS_STORE_NAME, {});
  let windowManager: ReturnType<typeof createWindowManager>;
  const emitIpcEvent = createEmitIpcEvent({
    getMainWindow: () => windowManager.getMainWindow(),
  });
  const externalEditManager = createExternalEditManager({
    emitEvent: emitIpcEvent,
  });
  const autoArchiveRuntime = new AutoArchiveRuntime({
    emitEvent: emitIpcEvent,
    getProtectedBlockIds: () => new Set(externalEditManager.listSessions().map((s) => s.blockId)),
    getWindowVisible: () => Boolean(windowManager.getMainWindow()?.isVisible()),
    settingsFilePath: settingsStore.path,
    store: backendStore,
  });
  const openBlockService = createOpenBlockService({
    emitEvent: emitIpcEvent,
    showWindow: () => windowManager.showMainWindow(),
  });
  const backendCommandDispatcher = createBackendCommandDispatcher({
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
  const deepLinkHandler = createDeepLinkHandler({
    dispatchCommand: backendCommandDispatcher.dispatch,
  });
  const cliIpcServer = createCliIpcServer({
    dispatchCommand: backendCommandDispatcher.dispatch,
  });
  windowManager = createWindowManager({
    emitEvent: emitIpcEvent,
    onAutoArchiveTrigger: (force) => void autoArchiveRuntime.trigger(force),
    onOpenBlockReady: () => openBlockService.emitPending(),
  });
  const trayManager = createTrayManager({
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
    toggleMainWindow: () => windowManager.toggleMainWindow(),
  });

  function registerRuntimeIpcCommands(): void {
    registerIpcCommands({
      acknowledgePendingOpenBlock: (blockId) => openBlockService.acknowledgePending(blockId),
      emitEvent: emitIpcEvent,
      externalEditManager,
      getMainWindow: () => windowManager.getMainWindow(),
      hideMainWindow: () => windowManager.hideMainWindow(),
      readPendingOpenBlock: () => openBlockService.readPending(),
      readPreferences: () =>
        getConfigStore(SETTINGS_STORE_NAME, {}).store as Record<string, unknown>,
      requestQuit: () => windowManager.requestQuit(),
      store: backendStore,
      toggleMainWindow: () => windowManager.toggleMainWindow(),
      writePreferences: (value) => {
        getConfigStore(SETTINGS_STORE_NAME, {}).store = value;
      },
    });
  }

  async function start(): Promise<void> {
    await backendStore.init();
    registerAssetProtocol(backendStore);
    registerRuntimeIpcCommands();
    await cliIpcServer.start();
    windowManager.createMainWindow();
    trayManager.createTray();
    await autoArchiveRuntime.start();

    const startupDeepLink = extractDeepLinkFromArgv(process.argv);
    if (startupDeepLink) {
      void deepLinkHandler.handle(startupDeepLink);
    }
  }

  async function stop(): Promise<void> {
    windowManager.prepareToQuit();
    autoArchiveRuntime.stop();
    globalShortcut.unregisterAll();
    trayManager.destroyTray();
    externalEditManager.cancelAll();
    await cliIpcServer.close();
    await backendStore.close();
  }

  function handleSecondInstance(argv: readonly string[]): void {
    windowManager.showMainWindow();
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) {
      void deepLinkHandler.handle(deepLink);
    }
  }

  function handleOpenUrl(urlText: string): void {
    void deepLinkHandler.handle(urlText);
  }

  function activate(): void {
    if (windowManager.getMainWindow() === null) {
      windowManager.createMainWindow();
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
