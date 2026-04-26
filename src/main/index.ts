/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import path from "node:path";

import { app, globalShortcut, protocol } from "electron";

import { registerAssetProtocol } from "./features/assets/asset-protocol";
import { AutoArchiveRuntime } from "./features/auto-archive-runtime";
import { createBackendCommandDispatcher } from "./features/backend-commands";
import { BackendStore } from "./features/backend-store";
import { createCliIpcServer } from "./features/cli/cli-ipc-server";
import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
} from "./features/deep-link/deep-link-handler";
import { createExternalEditManager } from "./features/external-edit/external-edit-manager";
import { createEmitIpcEvent } from "./features/ipc/emit-ipc-event";
import { registerIpcHandlers } from "./features/ipc/register-ipc-handlers";
import { createOpenBlockHandler } from "./features/open-block/open-block-handler";
import { getConfigStore } from "./features/preferences/config-store";
import { createTrayManager } from "./features/window/tray-manager";
import { createWindowManager } from "./features/window/window-manager";

const SETTINGS_STORE_NAME = "settings.json";
const DEEP_LINK_PROTOCOL = "fluxnote";

function registerDefaultProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
    return;
  }

  app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
}

registerDefaultProtocolClient();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  startPrimaryInstance();
}

function registerPrivilegedSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "assets",
      privileges: {
        bypassCSP: true,
        corsEnabled: true,
        secure: true,
        standard: true,
        stream: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

function startPrimaryInstance(): void {
  registerPrivilegedSchemes();

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
  const openBlockHandler = createOpenBlockHandler({
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
      openBlockHandler.requestOpen(blockId);
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
    onOpenBlockReady: () => openBlockHandler.emitPending(),
  });
  const trayManager = createTrayManager({
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
    toggleMainWindow: () => windowManager.toggleMainWindow(),
  });

  function registerAppIpcHandlers(): void {
    registerIpcHandlers({
      acknowledgePendingOpenBlock: (blockId) => openBlockHandler.acknowledgePending(blockId),
      emitEvent: emitIpcEvent,
      externalEditManager,
      getMainWindow: () => windowManager.getMainWindow(),
      hideMainWindow: () => windowManager.hideMainWindow(),
      readPendingOpenBlock: () => openBlockHandler.readPending(),
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

  app.on("second-instance", (_event, argv) => {
    windowManager.showMainWindow();
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) {
      void deepLinkHandler.handle(deepLink);
    }
  });

  app.on("open-url", (event, urlText) => {
    event.preventDefault();
    void deepLinkHandler.handle(urlText);
  });

  void app.whenReady().then(async () => {
    app.dock?.hide();
    await backendStore.init();
    registerAssetProtocol(backendStore);
    registerAppIpcHandlers();
    await cliIpcServer.start();
    windowManager.createMainWindow();
    trayManager.createTray();
    await autoArchiveRuntime.start();

    const startupDeepLink = extractDeepLinkFromArgv(process.argv);
    if (startupDeepLink) {
      void deepLinkHandler.handle(startupDeepLink);
    }

    app.on("activate", () => {
      if (windowManager.getMainWindow() === null) {
        windowManager.createMainWindow();
        return;
      }

      windowManager.showMainWindow();
    });
  });

  app.on("before-quit", async () => {
    windowManager.prepareToQuit();
    autoArchiveRuntime.stop();
    globalShortcut.unregisterAll();
    trayManager.destroyTray();
    externalEditManager.cancelAll();
    await cliIpcServer.close();
    await backendStore.close();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
