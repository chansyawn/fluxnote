import { z } from "zod";

import {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  AUTO_ARCHIVE_MIN_IDLE_MINUTES,
  normalizeAutoArchiveIdleMinutes,
} from "./auto-archive";

export const SETTINGS_SCHEMA_VERSION = 1;

export const LANGUAGE_OPTIONS = [
  { key: "en", name: "English", rtl: false },
  { key: "zh-Hans", name: "简体中文", rtl: false },
  { key: "pseudo", name: "Pseudo", rtl: false, devOnly: true },
] as const;

export const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20] as const;

export const localeSchema = z.enum(["en", "zh-Hans", "pseudo"]);
export const fontSizeSchema = z.union([
  z.literal(FONT_SIZE_OPTIONS[0]),
  z.literal(FONT_SIZE_OPTIONS[1]),
  z.literal(FONT_SIZE_OPTIONS[2]),
  z.literal(FONT_SIZE_OPTIONS[3]),
  z.literal(FONT_SIZE_OPTIONS[4]),
]);
export const shortcutActionSchema = z.enum(["toggle-window", "create-block", "delete-block"]);
export const shortcutBindingSchema = z.string().nullable();

const autoArchiveIdleMinutesSchema = z.preprocess(
  normalizeAutoArchiveIdleMinutes,
  z.number().int(),
);

export const autoArchiveSettingsSchema = z
  .object({
    enabled: z.boolean().catch(true),
    idleMinutes: autoArchiveIdleMinutesSchema.catch(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES),
  })
  .strict();

export const shortcutPreferencesSchema = z
  .object({
    "toggle-window": shortcutBindingSchema.catch("Alt+N"),
    "create-block": shortcutBindingSchema.catch("Mod+N"),
    "delete-block": shortcutBindingSchema.catch("Mod+W"),
  })
  .strict();

export const appearanceSettingsSchema = z
  .object({
    locale: localeSchema.catch("en"),
    fontSize: fontSizeSchema.catch(16),
  })
  .strict();

const appearanceSettingsPatchSchema = z
  .object({
    locale: localeSchema.optional(),
    fontSize: fontSizeSchema.optional(),
  })
  .strict();

const autoArchiveSettingsPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    idleMinutes: z
      .number()
      .int()
      .min(AUTO_ARCHIVE_MIN_IDLE_MINUTES)
      .max(AUTO_ARCHIVE_MAX_IDLE_MINUTES)
      .optional(),
  })
  .strict();

const shortcutPreferencesPatchSchema = z
  .object({
    "toggle-window": shortcutBindingSchema.optional(),
    "create-block": shortcutBindingSchema.optional(),
    "delete-block": shortcutBindingSchema.optional(),
  })
  .strict();

const defaultSettingsValue = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  appearance: {
    locale: "en",
    fontSize: 16,
  },
  autoArchive: {
    enabled: true,
    idleMinutes: AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  },
  shortcuts: {
    "toggle-window": "Alt+N",
    "create-block": "Mod+N",
    "delete-block": "Mod+W",
  },
} as const;

export const settingsSchema = z
  .object({
    schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
    appearance: appearanceSettingsSchema.catch(defaultSettingsValue.appearance),
    autoArchive: autoArchiveSettingsSchema.catch(defaultSettingsValue.autoArchive),
    shortcuts: shortcutPreferencesSchema.catch(defaultSettingsValue.shortcuts),
  })
  .strict();

export const settingsPatchSchema = z
  .object({
    appearance: appearanceSettingsPatchSchema.optional(),
    autoArchive: autoArchiveSettingsPatchSchema.optional(),
    shortcuts: shortcutPreferencesPatchSchema.optional(),
  })
  .strict();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type LocaleCode = z.infer<typeof localeSchema>;
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export type FontSize = z.infer<typeof fontSizeSchema>;
export type AutoArchiveSettings = z.infer<typeof autoArchiveSettingsSchema>;
export type ShortcutAction = z.infer<typeof shortcutActionSchema>;
export type ShortcutBinding = z.infer<typeof shortcutBindingSchema>;
export type ShortcutPreferences = z.infer<typeof shortcutPreferencesSchema>;

export const DEFAULT_SETTINGS: Settings = defaultSettingsValue;
export const DEFAULT_AUTO_ARCHIVE_SETTINGS: AutoArchiveSettings = DEFAULT_SETTINGS.autoArchive;

export function isLocaleCode(value: string): value is LocaleCode {
  return LANGUAGE_OPTIONS.some((option) => option.key === value);
}

export function isFontSize(value: number): value is FontSize {
  return FONT_SIZE_OPTIONS.some((size) => size === value);
}

export function normalizeSettings(input: unknown): Settings {
  const result = settingsSchema.safeParse(input);

  if (!result.success) {
    return DEFAULT_SETTINGS;
  }

  return result.data;
}

export function normalizeSettingsPatch(input: unknown): SettingsPatch {
  return settingsPatchSchema.parse(input);
}
