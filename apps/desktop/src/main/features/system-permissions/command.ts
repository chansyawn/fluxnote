import type { IpcRouter } from "@main/core/ipc";

import type { SystemPermissionsService } from "./service";

interface SystemPermissionsCommandDeps {
  service: SystemPermissionsService;
}

export function registerSystemPermissionsCommands(
  ipc: IpcRouter,
  deps: SystemPermissionsCommandDeps,
): void {
  ipc.command("system-permissions.get", ({ permission }) => {
    return deps.service.getStatus(permission);
  });

  ipc.command("system-permissions.open-settings", async ({ permission }) => {
    await deps.service.openSettings(permission);
    return undefined;
  });

  ipc.command("system-permissions.request", ({ permission }) => {
    return deps.service.request(permission);
  });
}
