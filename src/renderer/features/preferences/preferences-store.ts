import { LazyStore } from "@renderer/clients/store";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type AutoArchiveSettings,
  type LocaleCode,
  type Settings,
  type ShortcutAction,
} from "@renderer/features/preferences/preferences-schema";
import {
  normalizeShortcutPreferences,
  type ShortcutBinding,
  type ShortcutPreferences,
} from "@renderer/features/shortcut/shortcut-utils";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

const SETTINGS_STORE_PATH = "settings.json";

const settingsStore = new LazyStore(SETTINGS_STORE_PATH, {
  defaults: {
    locale: DEFAULT_SETTINGS.locale,
    autoArchive: DEFAULT_SETTINGS.autoArchive,
    shortcuts: DEFAULT_SETTINGS.shortcuts,
  },
});

const DEFAULT_NORMALIZED_SETTINGS = normalizeStoredSettings(DEFAULT_SETTINGS);

function parsePersistState<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    const payload = JSON.parse(value) as { state?: unknown };
    return (payload.state as T | undefined) ?? fallback;
  } catch {
    return fallback;
  }
}

type NormalizedSettings = Omit<Settings, "shortcuts"> & {
  shortcuts: ShortcutPreferences;
};

function normalizeStoredSettings(input: unknown): NormalizedSettings {
  const settings = normalizeSettings(input);

  return {
    ...settings,
    shortcuts: normalizeShortcutPreferences(settings.shortcuts),
  };
}

const settingsStateStorage: StateStorage = {
  getItem: async () => {
    await settingsStore.init();
    await settingsStore.reload({ ignoreDefaults: false });

    const settings = normalizeStoredSettings({
      locale: await settingsStore.get("locale"),
      autoArchive: await settingsStore.get("autoArchive"),
      shortcuts: await settingsStore.get("shortcuts"),
    });

    return JSON.stringify({ state: settings, version: 1 });
  },
  setItem: async (_, value) => {
    await settingsStore.init();
    const persistedState = parsePersistState<Settings>(value, DEFAULT_SETTINGS);
    const nextSettings = normalizeStoredSettings(persistedState);

    await settingsStore.set("locale", nextSettings.locale);
    await settingsStore.set("autoArchive", nextSettings.autoArchive);
    await settingsStore.set("shortcuts", nextSettings.shortcuts);
    await settingsStore.save();
  },
  removeItem: async () => {
    await settingsStore.init();
    await settingsStore.set("locale", DEFAULT_SETTINGS.locale);
    await settingsStore.set("autoArchive", DEFAULT_SETTINGS.autoArchive);
    await settingsStore.set("shortcuts", DEFAULT_SETTINGS.shortcuts);
    await settingsStore.save();
  },
};

interface SettingsStoreState extends NormalizedSettings {
  setLocale: (locale: LocaleCode) => void;
  patchAutoArchive: (patch: Partial<AutoArchiveSettings>) => void;
  setShortcut: (action: ShortcutAction, shortcut: ShortcutBinding) => void;
  clearShortcut: (action: ShortcutAction) => void;
  resetShortcut: (action: ShortcutAction) => void;
}

const usePreferencesStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_NORMALIZED_SETTINGS,
      setLocale: (locale) => {
        set({ locale });
      },
      patchAutoArchive: (patch) => {
        set((state) => ({ autoArchive: { ...state.autoArchive, ...patch } }));
      },
      setShortcut: (action, shortcut) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: shortcut,
          },
        }));
      },
      clearShortcut: (action) => {
        set((state) => ({ shortcuts: { ...state.shortcuts, [action]: null } }));
      },
      resetShortcut: (action) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: DEFAULT_NORMALIZED_SETTINGS.shortcuts[action],
          },
        }));
      },
    }),
    {
      name: "settings",
      version: 1,
      storage: createJSONStorage(() => settingsStateStorage),
      partialize: (state) => ({
        locale: state.locale,
        autoArchive: state.autoArchive,
        shortcuts: state.shortcuts,
      }),
      merge: (persistedState, currentState) => {
        const normalized = normalizeStoredSettings(persistedState);
        return {
          ...currentState,
          ...normalized,
        };
      },
    },
  ),
);

export function useLocalePreference() {
  return usePreferencesStore(
    useShallow((state) => ({
      locale: state.locale,
      setLocale: state.setLocale,
    })),
  );
}

export function useAutoArchivePreference() {
  return usePreferencesStore(
    useShallow((state) => ({
      autoArchive: state.autoArchive,
      patchAutoArchive: state.patchAutoArchive,
    })),
  );
}

export function useShortcutPreferences() {
  return usePreferencesStore(
    useShallow((state) => ({
      shortcuts: state.shortcuts,
      setShortcut: state.setShortcut,
      clearShortcut: state.clearShortcut,
      resetShortcut: state.resetShortcut,
    })),
  );
}
