import type { AppDatabase } from "@main/core/database";
import { createEventBus, type EventBus } from "@main/core/ipc";
import { createPersistenceRuntime, type PersistenceRuntime } from "@main/core/persistence";
import {
  createAutoArchiveRuntime,
  type AutoArchiveRuntime,
} from "@main/features/blocks/auto-archive-runtime";
import { createExternalEditManager, type ExternalEditManager } from "@main/features/external-edit";
import { createOpenBlockService, type OpenBlockService } from "@main/features/open-block";
import { createPreferencesService, type PreferencesService } from "@main/features/preferences";
import { createTrayManager, createWindowManager, type WindowManager } from "@main/features/window";

type TrayManager = ReturnType<typeof createTrayManager>;

export interface MainServices {
  autoArchiveRuntime: AutoArchiveRuntime;
  db: AppDatabase;
  events: EventBus;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  persistence: PersistenceRuntime;
  preferencesService: PreferencesService;
  trayManager: TrayManager;
  windowManager: WindowManager;
}

export function createMainServices(): MainServices {
  const persistence = createPersistenceRuntime();
  const events = createEventBus();
  const preferencesService = createPreferencesService();
  const emitEvent: EventBus["emit"] = (name, payload) => events.emit(name, payload);

  let windowManager: WindowManager;
  const externalEditManager = createExternalEditManager({ emitEvent });
  const autoArchiveRuntime = createAutoArchiveRuntime({
    emitEvent,
    getProtectedBlockIds: () => new Set(externalEditManager.listSessions().map((s) => s.blockId)),
    getWindowVisible: () => Boolean(windowManager.getMainWindow()?.isVisible()),
    persistence,
    readAutoArchiveSettings: preferencesService.readAutoArchiveSettings,
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
    openMainWindowDevTools: () => windowManager.openMainWindowDevTools(),
    requestQuit: () => windowManager.requestQuit(),
    showMainWindow: () => windowManager.showMainWindow(),
  });

  return {
    autoArchiveRuntime,
    get db() {
      return persistence.getDb();
    },
    events,
    externalEditManager,
    openBlockService,
    persistence,
    preferencesService,
    trayManager,
    windowManager,
  };
}
