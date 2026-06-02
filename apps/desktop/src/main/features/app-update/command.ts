import type { IpcRouter } from "@main/core/ipc";

import type { AppUpdateService } from "./service";

interface AppUpdateCommandDeps {
  appUpdateService: AppUpdateService;
}

export function registerAppUpdateCommands(ipc: IpcRouter, deps: AppUpdateCommandDeps): void {
  ipc.command("app-update.check", (input) => {
    return deps.appUpdateService.checkForUpdates(input.source);
  });

  ipc.command("app-update.get-status", () => {
    return deps.appUpdateService.getStatus();
  });

  ipc.command("app-update.restart-and-install", () => {
    deps.appUpdateService.restartAndInstall();
    return undefined;
  });
}
