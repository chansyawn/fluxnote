import { z } from "zod";

export const LANGUAGE_OPTIONS = [
  { key: "en", name: "English", rtl: false },
  { key: "zh-Hans", name: "简体中文", rtl: false },
  { key: "pseudo", name: "Pseudo", rtl: false, devOnly: true },
] as const;

export const localeSchema = z.enum(["en", "zh-Hans", "pseudo"]);
export type LocaleCode = z.infer<typeof localeSchema>;
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export const AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS = [1440, 4320, 10080, 43200] as const;
export type AutoArchiveIdleMinute = (typeof AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS)[number];

const autoArchiveIdleMinutesSchema = z.union([
  z.literal(AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS[0]),
  z.literal(AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS[1]),
  z.literal(AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS[2]),
  z.literal(AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS[3]),
]);

export const autoArchiveSettingsSchema = z.object({
  enabled: z.boolean().catch(true),
  idleMinutes: autoArchiveIdleMinutesSchema.catch(10080),
  scanIntervalSeconds: z.int().positive().catch(300),
});

export type AutoArchiveSettings = z.infer<typeof autoArchiveSettingsSchema>;

export const shortcutActionSchema = z.enum(["toggle-window", "create-block", "delete-block"]);
export const shortcutBindingSchema = z.string().nullable();
export const shortcutPreferencesSchema = z.object({
  "toggle-window": shortcutBindingSchema.catch("Alt+N"),
  "create-block": shortcutBindingSchema.catch("Mod+N"),
  "delete-block": shortcutBindingSchema.catch("Mod+W"),
});

export type ShortcutAction = z.infer<typeof shortcutActionSchema>;
export type ShortcutBinding = z.infer<typeof shortcutBindingSchema>;
export type ShortcutPreferences = z.infer<typeof shortcutPreferencesSchema>;

const DEFAULT_SETTINGS_VALUE = {
  locale: "en",
  autoArchive: {
    enabled: true,
    idleMinutes: 10080,
    scanIntervalSeconds: 300,
  },
  shortcuts: {
    "toggle-window": "Alt+N",
    "create-block": "Mod+N",
    "delete-block": "Mod+W",
  },
} as const;

export const settingsSchema = z.object({
  locale: localeSchema.catch(DEFAULT_SETTINGS_VALUE.locale),
  autoArchive: autoArchiveSettingsSchema.catch(DEFAULT_SETTINGS_VALUE.autoArchive),
  shortcuts: shortcutPreferencesSchema.catch(DEFAULT_SETTINGS_VALUE.shortcuts),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = DEFAULT_SETTINGS_VALUE;
export const DEFAULT_AUTO_ARCHIVE_SETTINGS: AutoArchiveSettings = DEFAULT_SETTINGS.autoArchive;

export function isLocaleCode(value: string): value is LocaleCode {
  return LANGUAGE_OPTIONS.some((option) => option.key === value);
}

export function normalizeSettings(input: unknown): Settings {
  const result = settingsSchema.safeParse(input);

  if (!result.success) {
    return DEFAULT_SETTINGS;
  }

  return result.data;
}
