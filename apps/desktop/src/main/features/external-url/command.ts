import type { IpcRouter } from "@main/core/ipc";
import { shell } from "electron";

import { fetchFavicon } from "./favicon";

export function registerExternalUrlCommands(ipc: IpcRouter): void {
  ipc.command("external-url.fetch-favicon", async ({ url }) => {
    return { faviconDataUrl: await fetchFavicon(url) };
  });

  ipc.command("external-url.open", async ({ url }) => {
    await shell.openExternal(url);
    return undefined;
  });
}
