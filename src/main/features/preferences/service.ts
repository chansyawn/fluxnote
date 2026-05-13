import { APP_SETTINGS_STORE_FILE } from "@shared/app/app-config";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeSettingsPatch,
  type AutoArchiveSettings,
  type Settings,
  type SettingsPatch,
} from "@shared/features/preferences/settings";

import { getConfigStore } from "./config-store";

interface PreferencesStorage {
  store: Record<string, unknown>;
}

export interface PreferencesService {
  patchSettings: (patch: SettingsPatch) => Settings;
  readAutoArchiveSettings: () => AutoArchiveSettings;
  readSettings: () => Settings;
  resetSettings: () => Settings;
}

function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  return normalizeSettings({
    ...current,
    appearance: {
      ...current.appearance,
      ...patch.appearance,
    },
    autoArchive: {
      ...current.autoArchive,
      ...patch.autoArchive,
    },
    shortcuts: {
      ...current.shortcuts,
      ...patch.shortcuts,
    },
    markdown: {
      ...current.markdown,
      ...patch.markdown,
      codeBlock: {
        ...current.markdown.codeBlock,
        ...patch.markdown?.codeBlock,
      },
    },
  });
}

export function createPreferencesService(
  storage: PreferencesStorage = getConfigStore(APP_SETTINGS_STORE_FILE, DEFAULT_SETTINGS),
): PreferencesService {
  function readSettings(): Settings {
    return normalizeSettings(storage.store);
  }

  function writeSettings(settings: Settings): Settings {
    storage.store = settings;
    return settings;
  }

  function patchSettings(input: SettingsPatch): Settings {
    const patch = normalizeSettingsPatch(input);
    const nextSettings = mergeSettings(readSettings(), patch);
    return writeSettings(nextSettings);
  }

  function resetSettings(): Settings {
    return writeSettings(DEFAULT_SETTINGS);
  }

  function readAutoArchiveSettings(): AutoArchiveSettings {
    return readSettings().autoArchive;
  }

  return {
    patchSettings,
    readAutoArchiveSettings,
    readSettings,
    resetSettings,
  };
}
