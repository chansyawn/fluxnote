import type { AppDatabase } from "@main/core/database/database-client";
import type { BackendStore } from "@main/core/persistence/backend-store";
import type { ExternalEditManager } from "@main/features/external-edit";
import type { OpenBlockService } from "@main/features/open-block";
import type { PreferencesService } from "@main/features/preferences";
import type { WindowManager } from "@main/features/window";

import { createEventBus, type EventBus } from "./core/ipc/event-bus";

export interface AppContext {
  store: BackendStore;
  getDb: () => Promise<AppDatabase>;
  now: () => Date;
  preferencesService: PreferencesService;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  windowManager: WindowManager;
  events: EventBus;
}

interface CreateAppContextOptions {
  store: BackendStore;
  preferencesService: PreferencesService;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  windowManager: WindowManager;
}

export function createAppContext(options: CreateAppContextOptions): AppContext {
  const events = createEventBus();

  return {
    store: options.store,
    getDb: async () => {
      await options.store.init();
      return options.store.getDb();
    },
    now: () => new Date(),
    preferencesService: options.preferencesService,
    externalEditManager: options.externalEditManager,
    openBlockService: options.openBlockService,
    windowManager: options.windowManager,
    events,
  };
}
