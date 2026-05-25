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
export const THEME_PREFERENCE_OPTIONS = ["system", "light", "dark"] as const;

export const localeSchema = z.enum(["en", "zh-Hans", "pseudo"]);
export const themePreferenceSchema = z.enum(THEME_PREFERENCE_OPTIONS);
export const fontSizeSchema = z.union([
  z.literal(FONT_SIZE_OPTIONS[0]),
  z.literal(FONT_SIZE_OPTIONS[1]),
  z.literal(FONT_SIZE_OPTIONS[2]),
  z.literal(FONT_SIZE_OPTIONS[3]),
  z.literal(FONT_SIZE_OPTIONS[4]),
]);
export const shortcutActionSchema = z.enum([
  "toggleWindow",
  "createBlock",
  "copyBlock",
  "keepBlock",
  "togglePinBlock",
  "archiveBlock",
  "deleteBlock",
  "quickCreateBlock",
  "submitExternalEdit",
  "cancelExternalEdit",
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
  toggleWindow: shortcutBindingSchema.catch("Alt+N"),
  createBlock: shortcutBindingSchema.catch("Mod+N"),
  copyBlock: shortcutBindingSchema.catch("Mod+Shift+C"),
  keepBlock: shortcutBindingSchema.catch("Mod+K"),
  togglePinBlock: shortcutBindingSchema.catch("Mod+T"),
  archiveBlock: shortcutBindingSchema.catch("Mod+E"),
  deleteBlock: shortcutBindingSchema.catch("Mod+D"),
  quickCreateBlock: shortcutBindingSchema.catch("Ctrl+Alt+N"),
  submitExternalEdit: shortcutBindingSchema.catch("Mod+Enter"),
  cancelExternalEdit: shortcutBindingSchema.catch("Mod+\\"),
});

export const appearanceSettingsSchema = z.object({
  locale: localeSchema.catch("en"),
  theme: themePreferenceSchema.catch("system"),
  fontSize: fontSizeSchema.catch(16),
});

export const markdownCodeBlockSettingsSchema = z.object({
  showLineNumbers: z.boolean().catch(defaultMarkdownCodeBlockSettingsValue.showLineNumbers),
  wordWrap: z.boolean().catch(defaultMarkdownCodeBlockSettingsValue.wordWrap),
});

export const markdownSettingsSchema = z.object({
  codeBlock: markdownCodeBlockSettingsSchema.catch(defaultMarkdownCodeBlockSettingsValue),
});

export const telemetrySettingsSchema = z.object({
  enabled: z.boolean().catch(true),
});

export const appUpdateSettingsSchema = z.object({
  automaticChecksEnabled: z.boolean().catch(true),
});

const appearanceSettingsPatchSchema = z
  .object({
    locale: localeSchema.optional(),
    theme: themePreferenceSchema.optional(),
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
    toggleWindow: shortcutBindingSchema.optional(),
    createBlock: shortcutBindingSchema.optional(),
    copyBlock: shortcutBindingSchema.optional(),
    keepBlock: shortcutBindingSchema.optional(),
    togglePinBlock: shortcutBindingSchema.optional(),
    archiveBlock: shortcutBindingSchema.optional(),
    deleteBlock: shortcutBindingSchema.optional(),
    quickCreateBlock: shortcutBindingSchema.optional(),
    submitExternalEdit: shortcutBindingSchema.optional(),
    cancelExternalEdit: shortcutBindingSchema.optional(),
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

const telemetrySettingsPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strict();

const appUpdateSettingsPatchSchema = z
  .object({
    automaticChecksEnabled: z.boolean().optional(),
  })
  .strict();

const defaultSettingsValue = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  appearance: {
    locale: "en",
    theme: "system",
    fontSize: 16,
  },
  autoArchive: {
    enabled: true,
    idleMinutes: AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  },
  shortcuts: {
    toggleWindow: "Alt+N",
    createBlock: "Mod+N",
    copyBlock: "Mod+Shift+C",
    keepBlock: "Mod+K",
    togglePinBlock: "Mod+T",
    archiveBlock: "Mod+E",
    deleteBlock: "Mod+D",
    quickCreateBlock: "Ctrl+Alt+N",
    submitExternalEdit: "Mod+Enter",
    cancelExternalEdit: "Mod+\\",
  },
  markdown: {
    codeBlock: defaultMarkdownCodeBlockSettingsValue,
  },
  telemetry: {
    enabled: true,
  },
  appUpdate: {
    automaticChecksEnabled: true,
  },
} as const;

export const settingsSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  appearance: appearanceSettingsSchema.catch(defaultSettingsValue.appearance),
  autoArchive: autoArchiveSettingsSchema.catch(defaultSettingsValue.autoArchive),
  shortcuts: shortcutPreferencesSchema.catch(defaultSettingsValue.shortcuts),
  markdown: markdownSettingsSchema.catch(defaultSettingsValue.markdown),
  telemetry: telemetrySettingsSchema.catch(defaultSettingsValue.telemetry),
  appUpdate: appUpdateSettingsSchema.catch(defaultSettingsValue.appUpdate),
});

export const settingsPatchSchema = z
  .object({
    appearance: appearanceSettingsPatchSchema.optional(),
    autoArchive: autoArchiveSettingsPatchSchema.optional(),
    shortcuts: shortcutPreferencesPatchSchema.optional(),
    markdown: markdownSettingsPatchSchema.optional(),
    telemetry: telemetrySettingsPatchSchema.optional(),
    appUpdate: appUpdateSettingsPatchSchema.optional(),
  })
  .strict();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type LocaleCode = z.infer<typeof localeSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export type FontSize = z.infer<typeof fontSizeSchema>;
export type AutoArchiveSettings = z.infer<typeof autoArchiveSettingsSchema>;
export type ShortcutAction = z.infer<typeof shortcutActionSchema>;
export type ShortcutBinding = z.infer<typeof shortcutBindingSchema>;
export type ShortcutPreferences = z.infer<typeof shortcutPreferencesSchema>;
export type MarkdownSettings = z.infer<typeof markdownSettingsSchema>;
export type MarkdownCodeBlockSettings = z.infer<typeof markdownCodeBlockSettingsSchema>;
export type TelemetrySettings = z.infer<typeof telemetrySettingsSchema>;
export type AppUpdateSettings = z.infer<typeof appUpdateSettingsSchema>;

export const DEFAULT_SETTINGS: Settings = defaultSettingsValue;
export const DEFAULT_AUTO_ARCHIVE_SETTINGS: AutoArchiveSettings = DEFAULT_SETTINGS.autoArchive;
export const DEFAULT_MARKDOWN_CODE_BLOCK_SETTINGS: MarkdownCodeBlockSettings =
  DEFAULT_SETTINGS.markdown.codeBlock;
export const DEFAULT_TELEMETRY_SETTINGS: TelemetrySettings = DEFAULT_SETTINGS.telemetry;
export const DEFAULT_APP_UPDATE_SETTINGS: AppUpdateSettings = DEFAULT_SETTINGS.appUpdate;

function createSettingsNormalizerSchema(defaults: Settings): z.ZodType<Settings> {
  return z.object({
    schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
    appearance: z
      .object({
        locale: localeSchema.catch(defaults.appearance.locale),
        theme: themePreferenceSchema.catch(defaults.appearance.theme),
        fontSize: fontSizeSchema.catch(defaults.appearance.fontSize),
      })
      .catch(defaults.appearance),
    autoArchive: z
      .object({
        enabled: z.boolean().catch(defaults.autoArchive.enabled),
        idleMinutes: autoArchiveIdleMinutesSchema.catch(defaults.autoArchive.idleMinutes),
      })
      .catch(defaults.autoArchive),
    shortcuts: z
      .object({
        toggleWindow: shortcutBindingSchema.catch(defaults.shortcuts.toggleWindow),
        createBlock: shortcutBindingSchema.catch(defaults.shortcuts.createBlock),
        copyBlock: shortcutBindingSchema.catch(defaults.shortcuts.copyBlock),
        keepBlock: shortcutBindingSchema.catch(defaults.shortcuts.keepBlock),
        togglePinBlock: shortcutBindingSchema.catch(defaults.shortcuts.togglePinBlock),
        archiveBlock: shortcutBindingSchema.catch(defaults.shortcuts.archiveBlock),
        deleteBlock: shortcutBindingSchema.catch(defaults.shortcuts.deleteBlock),
        quickCreateBlock: shortcutBindingSchema.catch(defaults.shortcuts.quickCreateBlock),
        submitExternalEdit: shortcutBindingSchema.catch(defaults.shortcuts.submitExternalEdit),
        cancelExternalEdit: shortcutBindingSchema.catch(defaults.shortcuts.cancelExternalEdit),
      })
      .catch(defaults.shortcuts),
    markdown: z
      .object({
        codeBlock: z
          .object({
            showLineNumbers: z.boolean().catch(defaults.markdown.codeBlock.showLineNumbers),
            wordWrap: z.boolean().catch(defaults.markdown.codeBlock.wordWrap),
          })
          .catch(defaults.markdown.codeBlock),
      })
      .catch(defaults.markdown),
    telemetry: z
      .object({
        enabled: z.boolean().catch(defaults.telemetry.enabled),
      })
      .catch(defaults.telemetry),
    appUpdate: z
      .object({
        automaticChecksEnabled: z.boolean().catch(defaults.appUpdate.automaticChecksEnabled),
      })
      .catch(defaults.appUpdate),
  });
}

function normalizeLanguageTag(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-");
}

function matchesLanguageFamily(language: string, family: string): boolean {
  return language === family || language.startsWith(`${family}-`);
}

export function resolvePreferredLocale(preferredLanguages: readonly string[]): LocaleCode {
  for (const preferredLanguage of preferredLanguages) {
    const language = normalizeLanguageTag(preferredLanguage);

    if (matchesLanguageFamily(language, "zh")) {
      return "zh-Hans";
    }

    if (matchesLanguageFamily(language, "en")) {
      return "en";
    }
  }

  return DEFAULT_SETTINGS.appearance.locale;
}

export function createDefaultSettings(locale: LocaleCode): Settings {
  return {
    ...DEFAULT_SETTINGS,
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      locale,
    },
  };
}

export function isLocaleCode(value: string): value is LocaleCode {
  return LANGUAGE_OPTIONS.some((option) => option.key === value);
}

export function isFontSize(value: number): value is FontSize {
  return FONT_SIZE_OPTIONS.some((size) => size === value);
}

export function isThemePreference(value: string): value is ThemePreference {
  return THEME_PREFERENCE_OPTIONS.some((theme) => theme === value);
}

export function normalizeSettings(input: unknown, defaults: Settings = DEFAULT_SETTINGS): Settings {
  const result = createSettingsNormalizerSchema(defaults).safeParse(input);

  if (!result.success) {
    return defaults;
  }

  return result.data;
}

export function normalizeSettingsPatch(input: unknown): SettingsPatch {
  return settingsPatchSchema.parse(input);
}
