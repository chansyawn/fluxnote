import type { IpcRouter } from "@main/core/ipc";

import { installCli, isCliInstalled, uninstallCli } from "./install-cli";

export function registerCliCommands(ipc: IpcRouter): void {
  ipc.command("cli.install", async () => {
    await installCli();
    return undefined;
  });

  ipc.command("cli.status", async () => {
    return {
      installed: await isCliInstalled(),
    };
  });

  ipc.command("cli.uninstall", async () => {
    await uninstallCli();
    return undefined;
  });
}
