import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeSettingsPatch,
  type AutoArchiveSettings,
  type Settings,
  type SettingsPatch,
} from "@shared/features/preferences/settings";

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

function areJsonValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => areJsonValuesEqual(value, right[index]));
  }

  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key, index) =>
      key === rightKeys[index] && areJsonValuesEqual(leftRecord[key], rightRecord[key]),
  );
}

export function createPreferencesService(
  storage: PreferencesStorage = { store: DEFAULT_SETTINGS },
): PreferencesService {
  function readSettings(): Settings {
    const settings = normalizeSettings(storage.store);
    if (!areJsonValuesEqual(storage.store, settings)) {
      return writeSettings(settings);
    }

    return settings;
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
