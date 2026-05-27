import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";
import type { TelemetryService } from "@main/features/telemetry";

import { createBlockRecord } from "../blocks/service";
import type { OpenBlockService } from "../open-block";
import type { WindowManager } from "./manager";

interface WindowCommandDeps {
  db: AppDatabase;
  openBlockService: OpenBlockService;
  telemetryService: Pick<TelemetryService, "captureEvent">;
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

  ipc.command("window.restart", () => {
    deps.windowManager.restartApp();
    return undefined;
  });

  ipc.command("window.toggle", () => {
    deps.windowManager.toggleMainWindow();
    return undefined;
  });

  ipc.command("window.quick-create-block", async () => {
    const block = await createBlockRecord(deps.db);
    deps.telemetryService.captureEvent("block_created", { source: "quick_create_shortcut" });
    deps.windowManager.activateMainWindow();
    deps.openBlockService.requestOpen({ blockId: block.id });
    return { blockId: block.id };
  });
}
