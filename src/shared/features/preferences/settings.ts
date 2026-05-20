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
export const shortcutActionSchema = z.enum([
  "toggle-window",
  "create-block",
  "copy-block",
  "keep-block",
  "toggle-pin-block",
  "archive-block",
  "delete-block",
  "quick-create-block",
  "submit-external-edit",
  "cancel-external-edit",
]);
export const shortcutBindingSchema = z.string().nullable();

const defaultMarkdownCodeBlockSettingsValue = {
  showLineNumbers: false,
  wordWrap: false,
} as const;

const autoArchiveIdleMinutesSchema = z.preprocess(
  normalizeAutoArchiveIdleMinutes,
  z.number().int(),
);

export const autoArchiveSettingsSchema = z.object({
  enabled: z.boolean().catch(true),
  idleMinutes: autoArchiveIdleMinutesSchema.catch(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES),
});

export const shortcutPreferencesSchema = z.object({
  "toggle-window": shortcutBindingSchema.catch("Alt+N"),
  "create-block": shortcutBindingSchema.catch("Mod+N"),
  "copy-block": shortcutBindingSchema.catch("Mod+Shift+C"),
  "keep-block": shortcutBindingSchema.catch("Mod+K"),
  "toggle-pin-block": shortcutBindingSchema.catch("Mod+T"),
  "archive-block": shortcutBindingSchema.catch("Mod+E"),
  "delete-block": shortcutBindingSchema.catch("Mod+D"),
  "quick-create-block": shortcutBindingSchema.catch("Ctrl+Alt+N"),
  "submit-external-edit": shortcutBindingSchema.catch("Mod+Enter"),
  "cancel-external-edit": shortcutBindingSchema.catch("Mod+\\"),
});

export const appearanceSettingsSchema = z.object({
  locale: localeSchema.catch("en"),
  fontSize: fontSizeSchema.catch(16),
});

export const markdownCodeBlockSettingsSchema = z.object({
  showLineNumbers: z.boolean().catch(defaultMarkdownCodeBlockSettingsValue.showLineNumbers),
  wordWrap: z.boolean().catch(defaultMarkdownCodeBlockSettingsValue.wordWrap),
});

export const markdownSettingsSchema = z.object({
  codeBlock: markdownCodeBlockSettingsSchema.catch(defaultMarkdownCodeBlockSettingsValue),
});

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
    "copy-block": shortcutBindingSchema.optional(),
    "keep-block": shortcutBindingSchema.optional(),
    "toggle-pin-block": shortcutBindingSchema.optional(),
    "archive-block": shortcutBindingSchema.optional(),
    "delete-block": shortcutBindingSchema.optional(),
    "quick-create-block": shortcutBindingSchema.optional(),
    "submit-external-edit": shortcutBindingSchema.optional(),
    "cancel-external-edit": shortcutBindingSchema.optional(),
  })
  .strict();

const markdownCodeBlockSettingsPatchSchema = z
  .object({
    showLineNumbers: z.boolean().optional(),
    wordWrap: z.boolean().optional(),
  })
  .strict();

const markdownSettingsPatchSchema = z
  .object({
    codeBlock: markdownCodeBlockSettingsPatchSchema.optional(),
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
    "copy-block": "Mod+Shift+C",
    "keep-block": "Mod+K",
    "toggle-pin-block": "Mod+T",
    "archive-block": "Mod+E",
    "delete-block": "Mod+D",
    "quick-create-block": "Ctrl+Alt+N",
    "submit-external-edit": "Mod+Enter",
    "cancel-external-edit": "Mod+\\",
  },
  markdown: {
    codeBlock: defaultMarkdownCodeBlockSettingsValue,
  },
} as const;

export const settingsSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  appearance: appearanceSettingsSchema.catch(defaultSettingsValue.appearance),
  autoArchive: autoArchiveSettingsSchema.catch(defaultSettingsValue.autoArchive),
  shortcuts: shortcutPreferencesSchema.catch(defaultSettingsValue.shortcuts),
  markdown: markdownSettingsSchema.catch(defaultSettingsValue.markdown),
});

export const settingsPatchSchema = z
  .object({
    appearance: appearanceSettingsPatchSchema.optional(),
    autoArchive: autoArchiveSettingsPatchSchema.optional(),
    shortcuts: shortcutPreferencesPatchSchema.optional(),
    markdown: markdownSettingsPatchSchema.optional(),
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
export type MarkdownSettings = z.infer<typeof markdownSettingsSchema>;
export type MarkdownCodeBlockSettings = z.infer<typeof markdownCodeBlockSettingsSchema>;

export const DEFAULT_SETTINGS: Settings = defaultSettingsValue;
export const DEFAULT_AUTO_ARCHIVE_SETTINGS: AutoArchiveSettings = DEFAULT_SETTINGS.autoArchive;
export const DEFAULT_MARKDOWN_CODE_BLOCK_SETTINGS: MarkdownCodeBlockSettings =
  DEFAULT_SETTINGS.markdown.codeBlock;

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
