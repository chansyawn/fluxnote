import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";

import { installCli, isCliInstalled, uninstallCli } from "./install-cli";

export function createCliIpcCommands(): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "cliInstall",
      async handle() {
        await installCli();
        return undefined;
      },
    }),
    defineIpcCommandDefinition({
      key: "cliUninstall",
      async handle() {
        await uninstallCli();
        return undefined;
      },
    }),
    defineIpcCommandDefinition({
      key: "cliStatus",
      async handle() {
        return { installed: await isCliInstalled() };
      },
    }),
  ] as const;
}
