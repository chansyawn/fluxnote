import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";

import { createBlockRecord } from "../blocks/service";
import type { OpenBlockService } from "../open-block";
import type { WindowManager } from "./manager";

interface WindowCommandDeps {
  db: AppDatabase;
  openBlockService: OpenBlockService;
  windowManager: WindowManager;
}

export function registerWindowCommands(ipc: IpcRouter, deps: WindowCommandDeps): void {
  ipc.command("window.destroy", () => {
    deps.windowManager.requestQuit();
    return undefined;
  });

  ipc.command("window.hide", () => {
    deps.windowManager.hideMainWindow();
    return undefined;
  });

  ipc.command("window.toggle", () => {
    deps.windowManager.toggleMainWindow();
    return undefined;
  });

  ipc.command("window.capture-block", async () => {
    const block = await createBlockRecord(deps.db);
    deps.windowManager.showMainWindow();
    deps.openBlockService.requestOpen(block.id);
    return { blockId: block.id };
  });
}
