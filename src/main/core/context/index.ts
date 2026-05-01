import type { AppDatabase } from "@main/core/database/database-client";
import type { PersistenceRuntime } from "@main/core/persistence";

import { createEventBus, type EventBus } from "../ipc/event-bus";

export interface RuntimePorts {
  clock: () => Date;
  db: AppDatabase;
  events: EventBus;
  persistence: PersistenceRuntime;
}

interface CreateRuntimePortsOptions {
  clock?: () => Date;
  db: AppDatabase;
  persistence: PersistenceRuntime;
}

export function createRuntimePorts(options: CreateRuntimePortsOptions): RuntimePorts {
  return {
    clock: options.clock ?? (() => new Date()),
    db: options.db,
    events: createEventBus(),
    persistence: options.persistence,
  };
}
