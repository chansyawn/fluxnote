import type { IpcRouter } from "@main/core/ipc";
import type {
  Settings,
  SettingsPatch,
  ThemePreference,
} from "@shared/features/preferences/settings";

import type { PreferencesService } from "./service";

interface PreferencesCommandDeps {
  applyThemePreference?: (theme: ThemePreference) => void;
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

function applyThemePreference(deps: PreferencesCommandDeps, settings: Settings): void {
  deps.applyThemePreference?.(settings.appearance.theme);
}

export function registerPreferencesCommands(ipc: IpcRouter, deps: PreferencesCommandDeps): void {
  ipc.command("preferences.patch", (input) => {
    const settings = deps.preferencesService.patchSettings(input);
    applyThemePreference(deps, settings);
    if (includesAutoArchivePreferences(input)) {
      notifyAutoArchivePreferencesChanged(deps);
    }
    return settings;
  });

  ipc.command("preferences.read", () => {
    const settings = deps.preferencesService.readSettings();
    applyThemePreference(deps, settings);
    return settings;
  });

  ipc.command("preferences.reset", () => {
    const settings = deps.preferencesService.resetSettings();
    applyThemePreference(deps, settings);
    notifyAutoArchivePreferencesChanged(deps);
    return settings;
  });
}
