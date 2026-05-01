import type { IpcRouter } from "@main/core/ipc/register-ipc";

import type { PreferencesService } from "./service";

interface PreferencesCommandDeps {
  preferencesService: PreferencesService;
}

export function registerPreferencesCommands(ipc: IpcRouter, deps: PreferencesCommandDeps): void {
  ipc.command("preferences.patch", (input) => {
    return deps.preferencesService.patchSettings(input);
  });

  ipc.command("preferences.read", () => {
    return deps.preferencesService.readSettings();
  });

  ipc.command("preferences.reset", () => {
    return deps.preferencesService.resetSettings();
  });
}
