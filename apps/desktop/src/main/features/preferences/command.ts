import type { IpcRouter } from "@main/core/ipc";
import type {
  UserPreferences,
  UserPreferencesPatch,
  ThemePreference,
} from "@shared/features/preferences/user-preferences";

import type { PreferencesService } from "./service";

interface PreferencesCommandDeps {
  applyThemePreference?: (theme: ThemePreference) => void;
  onLocalePreferenceChanged?: () => void;
  onAppUpdatePreferencesChanged?: (preferences: UserPreferences) => void;
  onAutoArchivePreferencesChanged?: () => Promise<void> | void;
  onTelemetryPreferenceChanged?: () => void;
  preferencesService: PreferencesService;
}

function includesAppUpdatePreferences(patch: UserPreferencesPatch): boolean {
  return patch.appUpdate !== undefined;
}

function includesAutoArchivePreferences(patch: UserPreferencesPatch): boolean {
  return patch.autoArchive !== undefined;
}

function includesLocalePreference(patch: UserPreferencesPatch): boolean {
  return patch.appearance?.locale !== undefined;
}

function includesTelemetryPreference(patch: UserPreferencesPatch): boolean {
  return patch.telemetry !== undefined;
}

function notifyAutoArchivePreferencesChanged(deps: PreferencesCommandDeps): void {
  void deps.onAutoArchivePreferencesChanged?.()?.catch((error: unknown) => {
    console.error("Failed to refresh auto archive state after preferences change", error);
  });
}

function applyThemePreference(deps: PreferencesCommandDeps, preferences: UserPreferences): void {
  deps.applyThemePreference?.(preferences.appearance.theme);
}

export function registerPreferencesCommands(ipc: IpcRouter, deps: PreferencesCommandDeps): void {
  ipc.command("preferences.patch", (input) => {
    const preferences = deps.preferencesService.patchUserPreferences(input);
    applyThemePreference(deps, preferences);
    if (includesLocalePreference(input)) {
      deps.onLocalePreferenceChanged?.();
    }
    if (includesAppUpdatePreferences(input)) {
      deps.onAppUpdatePreferencesChanged?.(preferences);
    }
    if (includesAutoArchivePreferences(input)) {
      notifyAutoArchivePreferencesChanged(deps);
    }
    if (includesTelemetryPreference(input)) {
      deps.onTelemetryPreferenceChanged?.();
    }
    return preferences;
  });

  ipc.command("preferences.read", () => {
    const preferences = deps.preferencesService.readUserPreferences();
    applyThemePreference(deps, preferences);
    return preferences;
  });

  ipc.command("preferences.reset", () => {
    const preferences = deps.preferencesService.resetUserPreferences();
    applyThemePreference(deps, preferences);
    deps.onLocalePreferenceChanged?.();
    deps.onAppUpdatePreferencesChanged?.(preferences);
    notifyAutoArchivePreferencesChanged(deps);
    deps.onTelemetryPreferenceChanged?.();
    return preferences;
  });
}
