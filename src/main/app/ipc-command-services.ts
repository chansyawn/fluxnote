import type { AppDatabase } from "@main/core/database/database-client";
import type { EmitIpcEvent } from "@main/core/ipc/emit-ipc-event";
import type { BackendStore } from "@main/core/persistence/backend-store";
import type { ExternalEditManager } from "@main/features/external-edit/manager";
import type { PendingOpenBlockRequest } from "@main/features/open-block/service";
import type { PreferencesService } from "@main/features/preferences";
import type { BrowserWindow } from "electron";

export interface RegisterIpcCommandsOptions {
  acknowledgePendingOpenBlock: (blockId: string) => void;
  emitEvent: EmitIpcEvent;
  externalEditManager: ExternalEditManager;
  getMainWindow: () => BrowserWindow | null;
  hideMainWindow: () => void;
  preferencesService: PreferencesService;
  readPendingOpenBlock: () => PendingOpenBlockRequest;
  requestQuit: () => void;
  store: BackendStore;
  toggleMainWindow: () => void;
}

export async function getAppDatabase(options: RegisterIpcCommandsOptions): Promise<AppDatabase> {
  await options.store.init();
  return options.store.getDb();
}
