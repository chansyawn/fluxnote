import type { EventName, EventPayload } from "@shared/ipc/types";
import { app, globalShortcut } from "electron";

import { createRuntimePorts } from "../core/context";
import { createEntrypointRuntime } from "../core/entrypoints/create-entrypoint-runtime";
import { createIpcRouter } from "../core/ipc/create-ipc-router";
import { registerIpc } from "../core/ipc/register-ipc";
import { createPersistenceRuntime } from "../core/persistence";
import { registerAssetProtocol } from "../features/assets/protocol";
import { AutoArchiveRuntime } from "../features/blocks/auto-archive-runtime";
import { extractDeepLinkFromArgv } from "../features/deep-link/handler";
import { createExternalEditManager } from "../features/external-edit";
import { createOpenBlockService } from "../features/open-block";
import { createPreferencesService } from "../features/preferences";
import { createTrayManager, createWindowManager } from "../features/window";

export function createBackendRuntime() {
  const persistence = createPersistenceRuntime();
  const preferencesService = createPreferencesService();
  let ports: ReturnType<typeof createRuntimePorts> | null = null;

  const emitEvent = <T extends EventName>(name: T, payload: EventPayload<T>): boolean => {
    return ports ? ports.events.emit(name, payload) : false;
  };

  let windowManager: ReturnType<typeof createWindowManager>;

  const externalEditManager = createExternalEditManager({ emitEvent });
  const autoArchiveRuntime = new AutoArchiveRuntime({
    emitEvent,
    getProtectedBlockIds: () => new Set(externalEditManager.listSessions().map((s) => s.blockId)),
    getWindowVisible: () => Boolean(windowManager.getMainWindow()?.isVisible()),
    readAutoArchiveSettings: preferencesService.readAutoArchiveSettings,
    persistence,
  });
  const openBlockService = createOpenBlockService({
    emitEvent,
    showWindow: () => windowManager.showMainWindow(),
  });

  let entrypointRuntime: ReturnType<typeof createEntrypointRuntime> | null = null;

  windowManager = createWindowManager({
    emitEvent,
    onAutoArchiveTrigger: (force) => void autoArchiveRuntime.trigger(force),
    onOpenBlockReady: () => openBlockService.emitPending(),
  });

  const trayManager = createTrayManager({
    openMainWindowDevTools: () => windowManager.openMainWindowDevTools(),
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
  });

  function registerMainWindowToEventBus(): void {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && ports) {
      ports.events.registerWindow(mainWindow);
    }
  }

  async function start(): Promise<void> {
    await persistence.init();
    const db = persistence.getDb();
    ports = createRuntimePorts({
      db,
      persistence,
    });
    entrypointRuntime = createEntrypointRuntime({
      createExternalEditSession: (blockId, originalContent, signal) =>
        externalEditManager.begin(blockId, originalContent, { signal }).result,
      getDb: async () => db,
      requestOpenBlock: (blockId) => {
        openBlockService.requestOpen(blockId);
      },
      showMainWindow: () => windowManager.showMainWindow(),
    });
    const ipc = createIpcRouter(ports);
    registerIpc(ipc, {
      externalEditManager,
      openBlockService,
      ports,
      preferencesService,
      windowManager,
    });

    registerAssetProtocol(persistence.paths);
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
    if (entrypointRuntime) {
      await entrypointRuntime.stopCliServer();
    }
    await persistence.close();
  }

  function handleSecondInstance(argv: readonly string[]): void {
    windowManager.showMainWindow();
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
