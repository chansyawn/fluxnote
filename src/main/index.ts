/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import { app, globalShortcut, protocol } from "electron";

import { registerAssetProtocol } from "./features/assets/asset-protocol";
import { AutoArchiveRuntime } from "./features/auto-archive-runtime";
import { BackendStore } from "./features/backend-store";
import {
  createDeepLinkHandler,
  extractDeepLinkFromArgv,
} from "./features/deep-link/deep-link-handler";
import { createEmitIpcEvent } from "./features/ipc/emit-ipc-event";
import { registerIpcHandlers } from "./features/ipc/register-ipc-handlers";
import { getConfigStore } from "./features/preferences/config-store";
import { createTrayManager } from "./features/window/tray-manager";
import { createWindowManager } from "./features/window/window-manager";

const SETTINGS_STORE_NAME = "settings.json";
const DEEP_LINK_PROTOCOL = "fluxnote";

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
  const autoArchiveRuntime = new AutoArchiveRuntime({
    emitEvent: emitIpcEvent,
    getWindowVisible: () => Boolean(windowManager.getMainWindow()?.isVisible()),
    settingsFilePath: settingsStore.path,
    store: backendStore,
  });
  const deepLinkHandler = createDeepLinkHandler({
    emitEvent: emitIpcEvent,
    showWindow: () => windowManager.showMainWindow(),
  });
  windowManager = createWindowManager({
    emitEvent: emitIpcEvent,
    onAutoArchiveTrigger: (force) => void autoArchiveRuntime.trigger(force),
    onDeepLinkReady: () => deepLinkHandler.emitPending(),
  });
  const trayManager = createTrayManager({
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
    toggleMainWindow: () => windowManager.toggleMainWindow(),
  });

  function registerAppIpcHandlers(): void {
    registerIpcHandlers({
      acknowledgePendingDeepLink: (blockId) => deepLinkHandler.acknowledgePending(blockId),
      emitEvent: emitIpcEvent,
      getMainWindow: () => windowManager.getMainWindow(),
      hideMainWindow: () => windowManager.hideMainWindow(),
      readPendingDeepLink: () => deepLinkHandler.readPending(),
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
      deepLinkHandler.handle(deepLink);
    }
  });

  app.on("open-url", (event, urlText) => {
    event.preventDefault();
    deepLinkHandler.handle(urlText);
  });

  void app.whenReady().then(async () => {
    app.dock?.hide();
    await backendStore.init();
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
    registerAssetProtocol(backendStore);
    registerAppIpcHandlers();
    windowManager.createMainWindow();
    trayManager.createTray();
    await autoArchiveRuntime.start();

    const startupDeepLink = extractDeepLinkFromArgv(process.argv);
    if (startupDeepLink) {
      deepLinkHandler.handle(startupDeepLink);
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
    await backendStore.close();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
