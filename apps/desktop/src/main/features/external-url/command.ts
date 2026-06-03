import type { IpcRouter } from "@main/core/ipc";
import { shell } from "electron";

export function registerExternalUrlCommands(ipc: IpcRouter): void {
  ipc.command("external-url.open", async ({ url }) => {
    await shell.openExternal(url);
    return undefined;
  });
}
