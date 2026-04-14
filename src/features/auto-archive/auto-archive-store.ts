import { LazyStore } from "@tauri-apps/plugin-store";

export const PREFERENCES_STORE_PATH = "preferences.json";
export const AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS = [1440, 4320, 10080, 43200] as const;

export interface AutoArchivePreferences {
  autoArchiveEnabled: boolean;
  autoArchiveIdleMinutes: number;
  autoArchiveScanIntervalSeconds: number;
}

export const DEFAULT_AUTO_ARCHIVE_PREFERENCES: AutoArchivePreferences = {
  autoArchiveEnabled: true,
  autoArchiveIdleMinutes: 10080,
  autoArchiveScanIntervalSeconds: 300,
};
const DEFAULT_AUTO_ARCHIVE_STORE_VALUES: Record<string, unknown> = {
  ...DEFAULT_AUTO_ARCHIVE_PREFERENCES,
};

const preferencesStore = new LazyStore(PREFERENCES_STORE_PATH, {
  autoSave: 100,
  defaults: DEFAULT_AUTO_ARCHIVE_STORE_VALUES,
});

export async function readAutoArchivePreferences(): Promise<AutoArchivePreferences> {
  await preferencesStore.init();
  await preferencesStore.reload({ ignoreDefaults: false });

  return {
    autoArchiveEnabled:
      (await preferencesStore.get<boolean>("autoArchiveEnabled")) ??
      DEFAULT_AUTO_ARCHIVE_PREFERENCES.autoArchiveEnabled,
    autoArchiveIdleMinutes:
      (await preferencesStore.get<number>("autoArchiveIdleMinutes")) ??
      DEFAULT_AUTO_ARCHIVE_PREFERENCES.autoArchiveIdleMinutes,
    autoArchiveScanIntervalSeconds:
      (await preferencesStore.get<number>("autoArchiveScanIntervalSeconds")) ??
      DEFAULT_AUTO_ARCHIVE_PREFERENCES.autoArchiveScanIntervalSeconds,
  };
}

export async function writeAutoArchivePreferences(
  nextPreferences: AutoArchivePreferences,
): Promise<AutoArchivePreferences> {
  await preferencesStore.init();
  await preferencesStore.set("autoArchiveEnabled", nextPreferences.autoArchiveEnabled);
  await preferencesStore.set("autoArchiveIdleMinutes", nextPreferences.autoArchiveIdleMinutes);
  await preferencesStore.set(
    "autoArchiveScanIntervalSeconds",
    nextPreferences.autoArchiveScanIntervalSeconds,
  );
  await preferencesStore.save();

  return nextPreferences;
}
