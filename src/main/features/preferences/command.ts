import type { IpcRouter } from "@main/core/ipc";
import type { SettingsPatch } from "@shared/features/preferences/settings";

import type { PreferencesService } from "./service";

interface PreferencesCommandDeps {
  onAutoArchivePreferencesChanged?: () => Promise<void> | void;
  preferencesService: PreferencesService;
}

function includesAutoArchivePreferences(patch: SettingsPatch): boolean {
  return patch.autoArchive !== undefined;
}

function notifyAutoArchivePreferencesChanged(deps: PreferencesCommandDeps): void {
  void deps.onAutoArchivePreferencesChanged?.()?.catch((error: unknown) => {
    console.error("Failed to refresh auto archive state after preferences change", error);
  });
}

export function registerPreferencesCommands(ipc: IpcRouter, deps: PreferencesCommandDeps): void {
  ipc.command("preferences.patch", (input) => {
    const settings = deps.preferencesService.patchSettings(input);
    if (includesAutoArchivePreferences(input)) {
      notifyAutoArchivePreferencesChanged(deps);
    }
    return settings;
  });

  ipc.command("preferences.read", () => {
    return deps.preferencesService.readSettings();
  });

  ipc.command("preferences.reset", () => {
    const settings = deps.preferencesService.resetSettings();
    notifyAutoArchivePreferencesChanged(deps);
    return settings;
  });
}
