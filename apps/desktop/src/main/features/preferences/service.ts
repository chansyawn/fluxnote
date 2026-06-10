import type { EventBus } from "@main/core/ipc";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  normalizeUserPreferencesPatch,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@shared/features/preferences/user-preferences";

interface PreferencesStorage {
  store: Record<string, unknown>;
}

export interface PreferencesService {
  patchUserPreferences: (patch: UserPreferencesPatch) => UserPreferences;
  readUserPreferences: () => UserPreferences;
  resetUserPreferences: () => UserPreferences;
}

interface PreferencesServiceOptions {
  defaults?: UserPreferences;
  emitEvent?: EventBus["emit"];
  storage?: PreferencesStorage;
}

function mergeUserPreferences(
  current: UserPreferences,
  patch: UserPreferencesPatch,
  defaults: UserPreferences,
): UserPreferences {
  return normalizeUserPreferences(
    {
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
      telemetry: {
        ...current.telemetry,
        ...patch.telemetry,
      },
      appUpdate: {
        ...current.appUpdate,
        ...patch.appUpdate,
      },
      externalEdit: {
        ...current.externalEdit,
        ...patch.externalEdit,
      },
    },
    defaults,
  );
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
  options: PreferencesServiceOptions | PreferencesStorage = {},
): PreferencesService {
  const serviceOptions = "store" in options ? { storage: options } : options;
  const defaults = serviceOptions.defaults ?? DEFAULT_USER_PREFERENCES;
  const storage = serviceOptions.storage ?? { store: defaults };
  const emitEvent = serviceOptions.emitEvent;

  function readUserPreferences(): UserPreferences {
    const preferences = normalizeUserPreferences(storage.store, defaults);
    if (!areJsonValuesEqual(storage.store, preferences)) {
      return writeUserPreferences(preferences);
    }

    return preferences;
  }

  function writeUserPreferences(preferences: UserPreferences): UserPreferences {
    storage.store = preferences;
    return preferences;
  }

  function writeAndNotify(preferences: UserPreferences): UserPreferences {
    const writtenPreferences = writeUserPreferences(preferences);
    emitEvent?.("preferences.changed", writtenPreferences);
    return writtenPreferences;
  }

  function patchUserPreferences(input: UserPreferencesPatch): UserPreferences {
    const patch = normalizeUserPreferencesPatch(input);
    const nextPreferences = mergeUserPreferences(readUserPreferences(), patch, defaults);
    return writeAndNotify(nextPreferences);
  }

  function resetUserPreferences(): UserPreferences {
    return writeAndNotify(defaults);
  }

  return {
    patchUserPreferences,
    readUserPreferences,
    resetUserPreferences,
  };
}
