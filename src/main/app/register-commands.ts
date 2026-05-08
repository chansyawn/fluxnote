import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";
import type { EventBus } from "@main/core/ipc";
import type { PersistenceRuntime } from "@main/core/persistence";

import { registerAssetsCommands } from "../features/assets/command";
import { registerBlocksCommands } from "../features/blocks/command";
import { registerCliCommands } from "../features/cli/command";
import { registerClipboardCommands } from "../features/clipboard";
import type { ExternalEditManager } from "../features/external-edit";
import { registerExternalEditCommands } from "../features/external-edit/command";
import type { OpenBlockService } from "../features/open-block";
import { registerOpenBlockCommands } from "../features/open-block/command";
import type { PreferencesService } from "../features/preferences";
import { registerPreferencesCommands } from "../features/preferences/command";
import { registerShortcutCommands } from "../features/shortcut/command";
import { registerTagsCommands } from "../features/tags/command";
import type { WindowManager } from "../features/window";
import { registerWindowCommands } from "../features/window/command";

export interface RegisterFeatureCommandsDeps {
  db: AppDatabase;
  events: EventBus;
  externalEditManager: ExternalEditManager;
  now: () => Date;
  openBlockService: OpenBlockService;
  persistence: PersistenceRuntime;
  preferencesService: PreferencesService;
  windowManager: WindowManager;
}

export function registerFeatureCommands(ipc: IpcRouter, deps: RegisterFeatureCommandsDeps): void {
  registerAssetsCommands(ipc, {
    db: deps.db,
    persistence: deps.persistence,
  });
  registerBlocksCommands(ipc, {
    db: deps.db,
    getAssetPathForBlock: deps.persistence.paths.getAssetPathForBlock,
    listExternalEditSessions: deps.externalEditManager.listSessions,
    now: deps.now,
    readAutoArchiveSettings: deps.preferencesService.readAutoArchiveSettings,
  });
  registerClipboardCommands(ipc);
  registerCliCommands(ipc);
  registerExternalEditCommands(ipc, {
    db: deps.db,
    manager: deps.externalEditManager,
    paths: deps.persistence.paths,
  });
  registerOpenBlockCommands(ipc, {
    openBlockService: deps.openBlockService,
  });
  registerPreferencesCommands(ipc, {
    preferencesService: deps.preferencesService,
  });
  registerShortcutCommands(ipc, {
    events: deps.events,
  });
  registerTagsCommands(ipc, {
    db: deps.db,
  });
  registerWindowCommands(ipc, {
    windowManager: deps.windowManager,
  });
  ipc.register();
}
