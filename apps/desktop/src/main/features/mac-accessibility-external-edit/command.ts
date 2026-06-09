import type { IpcRouter } from "@main/core/ipc";

import type { MacAccessibilityExternalEditService } from "./service";

interface MacAccessibilityExternalEditCommandDeps {
  service: MacAccessibilityExternalEditService;
}

export function registerMacAccessibilityExternalEditCommands(
  ipc: IpcRouter,
  deps: MacAccessibilityExternalEditCommandDeps,
): void {
  ipc.command("external-edit.start-focused", async () => {
    return await deps.service.startFocusedExternalEdit();
  });
}
