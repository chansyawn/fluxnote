import {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  normalizeAutoArchiveIdleMinutes,
} from "@shared/features/preferences";
import { z } from "zod";

export const LANGUAGE_OPTIONS = [
  { key: "en", name: "English", rtl: false },
  { key: "zh-Hans", name: "简体中文", rtl: false },
  { key: "pseudo", name: "Pseudo", rtl: false, devOnly: true },
] as const;

export const localeSchema = z.enum(["en", "zh-Hans", "pseudo"]);
export type LocaleCode = z.infer<typeof localeSchema>;
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20] as const;
export type FontSize = (typeof FONT_SIZE_OPTIONS)[number];

export const fontSizeSchema = z.union([
  z.literal(FONT_SIZE_OPTIONS[0]),
  z.literal(FONT_SIZE_OPTIONS[1]),
  z.literal(FONT_SIZE_OPTIONS[2]),
  z.literal(FONT_SIZE_OPTIONS[3]),
  z.literal(FONT_SIZE_OPTIONS[4]),
]);

const autoArchiveIdleMinutesSchema = z.preprocess(
  normalizeAutoArchiveIdleMinutes,
  z.number().int(),
);

export const autoArchiveSettingsSchema = z.object({
  enabled: z.boolean().catch(true),
  idleMinutes: autoArchiveIdleMinutesSchema.catch(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES),
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
    idleMinutes: AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
    scanIntervalSeconds: 300,
  },
  shortcuts: {
    "toggle-window": "Alt+N",
    "create-block": "Mod+N",
    "delete-block": "Mod+W",
  },
  fontSize: 16,
} as const;

export const settingsSchema = z.object({
  locale: localeSchema.catch(DEFAULT_SETTINGS_VALUE.locale),
  autoArchive: autoArchiveSettingsSchema.catch(DEFAULT_SETTINGS_VALUE.autoArchive),
  shortcuts: shortcutPreferencesSchema.catch(DEFAULT_SETTINGS_VALUE.shortcuts),
  fontSize: fontSizeSchema.catch(DEFAULT_SETTINGS_VALUE.fontSize),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = DEFAULT_SETTINGS_VALUE;
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
