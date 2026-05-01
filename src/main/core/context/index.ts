import type { AppDatabase } from "@main/core/database/database-client";
import type { PersistenceRuntime } from "@main/core/persistence";
import type { ExternalEditManager } from "@main/features/external-edit";
import type { OpenBlockService } from "@main/features/open-block";
import type { PreferencesService } from "@main/features/preferences";
import type { WindowManager } from "@main/features/window";

import { createEventBus, type EventBus } from "../ipc/event-bus";

export interface AppContext {
  persistence: PersistenceRuntime;
  getDb: () => Promise<AppDatabase>;
  now: () => Date;
  preferencesService: PreferencesService;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  windowManager: WindowManager;
  events: EventBus;
}

interface CreateAppContextOptions {
  persistence: PersistenceRuntime;
  preferencesService: PreferencesService;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  windowManager: WindowManager;
}

export function createAppContext(options: CreateAppContextOptions): AppContext {
  const events = createEventBus();

  return {
    persistence: options.persistence,
    getDb: async () => {
      await options.persistence.init();
      return options.persistence.getDb();
    },
    now: () => new Date(),
    preferencesService: options.preferencesService,
    externalEditManager: options.externalEditManager,
    openBlockService: options.openBlockService,
    windowManager: options.windowManager,
    events,
  };
}
