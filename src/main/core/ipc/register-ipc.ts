import { registerAssetsCommands } from "../../features/assets/command";
import { registerBlocksCommands } from "../../features/blocks/command";
import { registerCliCommands } from "../../features/cli/command";
import type { ExternalEditManager } from "../../features/external-edit";
import { registerExternalEditCommands } from "../../features/external-edit/command";
import type { OpenBlockService } from "../../features/open-block";
import { registerOpenBlockCommands } from "../../features/open-block/command";
import type { PreferencesService } from "../../features/preferences";
import { registerPreferencesCommands } from "../../features/preferences/command";
import { registerShortcutCommands } from "../../features/shortcut/command";
import { registerTagsCommands } from "../../features/tags/command";
import type { WindowManager } from "../../features/window";
import { registerWindowCommands } from "../../features/window/command";
import type { RuntimePorts } from "../context";
import type { createIpcRouter } from "./create-ipc-router";

export type IpcRouter = ReturnType<typeof createIpcRouter>;

export interface FeatureDepsMap {
  ports: RuntimePorts;
  preferencesService: PreferencesService;
  externalEditManager: ExternalEditManager;
  openBlockService: OpenBlockService;
  windowManager: WindowManager;
}

export function registerIpc(ipc: IpcRouter, deps: FeatureDepsMap): void {
  registerAssetsCommands(ipc, {
    persistence: deps.ports.persistence,
    db: deps.ports.db,
  });
  registerBlocksCommands(ipc, {
    db: deps.ports.db,
    getAssetPathForBlock: deps.ports.persistence.paths.getAssetPathForBlock,
    listExternalEditSessions: deps.externalEditManager.listSessions,
    now: deps.ports.clock,
    readAutoArchiveSettings: deps.preferencesService.readAutoArchiveSettings,
  });
  registerCliCommands(ipc);
  registerExternalEditCommands(ipc, {
    db: deps.ports.db,
    manager: deps.externalEditManager,
  });
  registerOpenBlockCommands(ipc, {
    openBlockService: deps.openBlockService,
  });
  registerPreferencesCommands(ipc, {
    preferencesService: deps.preferencesService,
  });
  registerShortcutCommands(ipc, {
    events: deps.ports.events,
  });
  registerTagsCommands(ipc, {
    db: deps.ports.db,
  });
  registerWindowCommands(ipc, {
    windowManager: deps.windowManager,
  });
  ipc.register();
}
