import { registerAssetsCommands } from "../../features/assets/assets-command";
import { registerBlocksCommands } from "../../features/blocks/blocks-command";
import { registerCliCommands } from "../../features/cli/cli-command";
import { registerExternalEditCommands } from "../../features/external-edit/external-edit-command";
import { registerOpenBlockCommands } from "../../features/open-block/open-block-command";
import { registerPreferencesCommands } from "../../features/preferences/preferences-command";
import { registerShortcutCommands } from "../../features/shortcut/shortcut-command";
import { registerTagsCommands } from "../../features/tags/tags-command";
import { registerWindowCommands } from "../../features/window/window-command";
import type { createIpcRouter } from "./create-ipc-router";

export type IpcRouter = ReturnType<typeof createIpcRouter>;

export function registerIpc(ipc: IpcRouter): void {
  registerAssetsCommands(ipc);
  registerBlocksCommands(ipc);
  registerCliCommands(ipc);
  registerExternalEditCommands(ipc);
  registerOpenBlockCommands(ipc);
  registerPreferencesCommands(ipc);
  registerShortcutCommands(ipc);
  registerTagsCommands(ipc);
  registerWindowCommands(ipc);
  ipc.register();
}
