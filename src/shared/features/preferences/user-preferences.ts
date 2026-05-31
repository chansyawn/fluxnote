import { z } from "zod";

import {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  AUTO_ARCHIVE_MIN_IDLE_MINUTES,
  normalizeAutoArchiveIdleMinutes,
} from "./auto-archive";

export const USER_PREFERENCES_SCHEMA_VERSION = 1;

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
  "global.toggleWindow",
  "global.quickCreateBlock",
  "workspace.createBlock",
  "workspace.copyBlock",
  "workspace.keepBlock",
  "workspace.togglePinBlock",
  "workspace.archiveBlock",
  "workspace.deleteBlock",
  "workspace.submitExternalEdit",
  "workspace.cancelExternalEdit",
  "editor.heading1",
  "editor.heading2",
  "editor.heading3",
  "editor.heading4",
  "editor.heading5",
  "editor.heading6",
  "editor.blockquote",
  "editor.bulletList",
  "editor.orderedList",
  "editor.codeBlock",
  "editor.paragraph",
  "editor.bold",
  "editor.italic",
  "editor.strikethrough",
  "editor.inlineCode",
]);
export const shortcutBindingSchema = z.string().nullable();

const defaultMarkdownCodeBlockPreferencesValue = {
  showLineNumbers: false,
} as const;

const autoArchiveIdleMinutesSchema = z.preprocess(
  normalizeAutoArchiveIdleMinutes,
  z.number().int(),
);

export const autoArchivePreferencesSchema = z.object({
  enabled: z.boolean().catch(true),
  idleMinutes: autoArchiveIdleMinutesSchema.catch(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES),
});

export const shortcutPreferencesSchema = z.object({
  "global.toggleWindow": shortcutBindingSchema.catch("Alt+N"),
  "global.quickCreateBlock": shortcutBindingSchema.catch("Ctrl+Alt+N"),
  "workspace.createBlock": shortcutBindingSchema.catch("Mod+N"),
  "workspace.copyBlock": shortcutBindingSchema.catch("Mod+Shift+C"),
  "workspace.keepBlock": shortcutBindingSchema.catch("Mod+K"),
  "workspace.togglePinBlock": shortcutBindingSchema.catch("Mod+T"),
  "workspace.archiveBlock": shortcutBindingSchema.catch("Mod+E"),
  "workspace.deleteBlock": shortcutBindingSchema.catch("Mod+D"),
  "workspace.submitExternalEdit": shortcutBindingSchema.catch("Mod+Enter"),
  "workspace.cancelExternalEdit": shortcutBindingSchema.catch("Mod+\\"),
  "editor.heading1": shortcutBindingSchema.catch("Mod+Alt+1"),
  "editor.heading2": shortcutBindingSchema.catch("Mod+Alt+2"),
  "editor.heading3": shortcutBindingSchema.catch("Mod+Alt+3"),
  "editor.heading4": shortcutBindingSchema.catch("Mod+Alt+4"),
  "editor.heading5": shortcutBindingSchema.catch("Mod+Alt+5"),
  "editor.heading6": shortcutBindingSchema.catch("Mod+Alt+6"),
  "editor.blockquote": shortcutBindingSchema.catch("Mod+Shift+B"),
  "editor.bulletList": shortcutBindingSchema.catch("Mod+Alt+8"),
  "editor.orderedList": shortcutBindingSchema.catch("Mod+Alt+7"),
  "editor.codeBlock": shortcutBindingSchema.catch("Mod+Alt+C"),
  "editor.paragraph": shortcutBindingSchema.catch("Mod+Alt+0"),
  "editor.bold": shortcutBindingSchema.catch("Mod+B"),
  "editor.italic": shortcutBindingSchema.catch("Mod+I"),
  "editor.strikethrough": shortcutBindingSchema.catch("Mod+Shift+X"),
  "editor.inlineCode": shortcutBindingSchema.catch("Mod+Shift+E"),
});

export const appearancePreferencesSchema = z.object({
  locale: localeSchema.catch("en"),
  theme: themePreferenceSchema.catch("system"),
  fontSize: fontSizeSchema.catch(16),
});

export const markdownCodeBlockPreferencesSchema = z.object({
  showLineNumbers: z.boolean().catch(defaultMarkdownCodeBlockPreferencesValue.showLineNumbers),
});

export const markdownPreferencesSchema = z.object({
  codeBlock: markdownCodeBlockPreferencesSchema.catch(defaultMarkdownCodeBlockPreferencesValue),
});

export const telemetryPreferencesSchema = z.object({
  enabled: z.boolean().catch(true),
});

export const appUpdatePreferencesSchema = z.object({
  automaticChecksEnabled: z.boolean().catch(true),
});

const appearancePreferencesPatchSchema = z
  .object({
    locale: localeSchema.optional(),
    theme: themePreferenceSchema.optional(),
    fontSize: fontSizeSchema.optional(),
  })
  .strict();

const autoArchivePreferencesPatchSchema = z
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
    "global.toggleWindow": shortcutBindingSchema.optional(),
    "global.quickCreateBlock": shortcutBindingSchema.optional(),
    "workspace.createBlock": shortcutBindingSchema.optional(),
    "workspace.copyBlock": shortcutBindingSchema.optional(),
    "workspace.keepBlock": shortcutBindingSchema.optional(),
    "workspace.togglePinBlock": shortcutBindingSchema.optional(),
    "workspace.archiveBlock": shortcutBindingSchema.optional(),
    "workspace.deleteBlock": shortcutBindingSchema.optional(),
    "workspace.submitExternalEdit": shortcutBindingSchema.optional(),
    "workspace.cancelExternalEdit": shortcutBindingSchema.optional(),
    "editor.heading1": shortcutBindingSchema.optional(),
    "editor.heading2": shortcutBindingSchema.optional(),
    "editor.heading3": shortcutBindingSchema.optional(),
    "editor.heading4": shortcutBindingSchema.optional(),
    "editor.heading5": shortcutBindingSchema.optional(),
    "editor.heading6": shortcutBindingSchema.optional(),
    "editor.blockquote": shortcutBindingSchema.optional(),
    "editor.bulletList": shortcutBindingSchema.optional(),
    "editor.orderedList": shortcutBindingSchema.optional(),
    "editor.codeBlock": shortcutBindingSchema.optional(),
    "editor.paragraph": shortcutBindingSchema.optional(),
    "editor.bold": shortcutBindingSchema.optional(),
    "editor.italic": shortcutBindingSchema.optional(),
    "editor.strikethrough": shortcutBindingSchema.optional(),
    "editor.inlineCode": shortcutBindingSchema.optional(),
  })
  .strict();

const markdownCodeBlockPreferencesPatchSchema = z
  .object({
    showLineNumbers: z.boolean().optional(),
  })
  .strict();

const markdownPreferencesPatchSchema = z
  .object({
    codeBlock: markdownCodeBlockPreferencesPatchSchema.optional(),
  })
  .strict();

const telemetryPreferencesPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strict();

const appUpdatePreferencesPatchSchema = z
  .object({
    automaticChecksEnabled: z.boolean().optional(),
  })
  .strict();

const defaultUserPreferencesValue = {
  schemaVersion: USER_PREFERENCES_SCHEMA_VERSION,
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
    "global.toggleWindow": "Alt+N",
    "global.quickCreateBlock": "Ctrl+Alt+N",
    "workspace.createBlock": "Mod+N",
    "workspace.copyBlock": "Mod+Shift+C",
    "workspace.keepBlock": "Mod+K",
    "workspace.togglePinBlock": "Mod+T",
    "workspace.archiveBlock": "Mod+E",
    "workspace.deleteBlock": "Mod+D",
    "workspace.submitExternalEdit": "Mod+Enter",
    "workspace.cancelExternalEdit": "Mod+\\",
    "editor.heading1": "Mod+Alt+1",
    "editor.heading2": "Mod+Alt+2",
    "editor.heading3": "Mod+Alt+3",
    "editor.heading4": "Mod+Alt+4",
    "editor.heading5": "Mod+Alt+5",
    "editor.heading6": "Mod+Alt+6",
    "editor.blockquote": "Mod+Shift+B",
    "editor.bulletList": "Mod+Alt+8",
    "editor.orderedList": "Mod+Alt+7",
    "editor.codeBlock": "Mod+Alt+C",
    "editor.paragraph": "Mod+Alt+0",
    "editor.bold": "Mod+B",
    "editor.italic": "Mod+I",
    "editor.strikethrough": "Mod+Shift+X",
    "editor.inlineCode": "Mod+Shift+E",
  },
  markdown: {
    codeBlock: defaultMarkdownCodeBlockPreferencesValue,
  },
  telemetry: {
    enabled: true,
  },
  appUpdate: {
    automaticChecksEnabled: true,
  },
} as const;

export const userPreferencesSchema = z.object({
  schemaVersion: z.literal(USER_PREFERENCES_SCHEMA_VERSION),
  appearance: appearancePreferencesSchema.catch(defaultUserPreferencesValue.appearance),
  autoArchive: autoArchivePreferencesSchema.catch(defaultUserPreferencesValue.autoArchive),
  shortcuts: shortcutPreferencesSchema.catch(defaultUserPreferencesValue.shortcuts),
  markdown: markdownPreferencesSchema.catch(defaultUserPreferencesValue.markdown),
  telemetry: telemetryPreferencesSchema.catch(defaultUserPreferencesValue.telemetry),
  appUpdate: appUpdatePreferencesSchema.catch(defaultUserPreferencesValue.appUpdate),
});

export const userPreferencesPatchSchema = z
  .object({
    appearance: appearancePreferencesPatchSchema.optional(),
    autoArchive: autoArchivePreferencesPatchSchema.optional(),
    shortcuts: shortcutPreferencesPatchSchema.optional(),
    markdown: markdownPreferencesPatchSchema.optional(),
    telemetry: telemetryPreferencesPatchSchema.optional(),
    appUpdate: appUpdatePreferencesPatchSchema.optional(),
  })
  .strict();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;
export type LocaleCode = z.infer<typeof localeSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export type FontSize = z.infer<typeof fontSizeSchema>;
export type AutoArchivePreferences = z.infer<typeof autoArchivePreferencesSchema>;
export type ShortcutAction = z.infer<typeof shortcutActionSchema>;
export type ShortcutBinding = z.infer<typeof shortcutBindingSchema>;
export type ShortcutPreferences = z.infer<typeof shortcutPreferencesSchema>;
export type MarkdownPreferences = z.infer<typeof markdownPreferencesSchema>;
export type MarkdownCodeBlockPreferences = z.infer<typeof markdownCodeBlockPreferencesSchema>;
export type TelemetryPreferences = z.infer<typeof telemetryPreferencesSchema>;
export type AppUpdatePreferences = z.infer<typeof appUpdatePreferencesSchema>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = defaultUserPreferencesValue;
export const DEFAULT_AUTO_ARCHIVE_PREFERENCES: AutoArchivePreferences =
  DEFAULT_USER_PREFERENCES.autoArchive;
export const DEFAULT_MARKDOWN_CODE_BLOCK_PREFERENCES: MarkdownCodeBlockPreferences =
  DEFAULT_USER_PREFERENCES.markdown.codeBlock;
export const DEFAULT_TELEMETRY_PREFERENCES: TelemetryPreferences =
  DEFAULT_USER_PREFERENCES.telemetry;
export const DEFAULT_APP_UPDATE_PREFERENCES: AppUpdatePreferences =
  DEFAULT_USER_PREFERENCES.appUpdate;

function createUserPreferencesNormalizerSchema(
  defaults: UserPreferences,
): z.ZodType<UserPreferences> {
  return z.object({
    schemaVersion: z.literal(USER_PREFERENCES_SCHEMA_VERSION),
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
        "global.toggleWindow": shortcutBindingSchema.catch(
          defaults.shortcuts["global.toggleWindow"],
        ),
        "global.quickCreateBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["global.quickCreateBlock"],
        ),
        "workspace.createBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.createBlock"],
        ),
        "workspace.copyBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.copyBlock"],
        ),
        "workspace.keepBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.keepBlock"],
        ),
        "workspace.togglePinBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.togglePinBlock"],
        ),
        "workspace.archiveBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.archiveBlock"],
        ),
        "workspace.deleteBlock": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.deleteBlock"],
        ),
        "workspace.submitExternalEdit": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.submitExternalEdit"],
        ),
        "workspace.cancelExternalEdit": shortcutBindingSchema.catch(
          defaults.shortcuts["workspace.cancelExternalEdit"],
        ),
        "editor.heading1": shortcutBindingSchema.catch(defaults.shortcuts["editor.heading1"]),
        "editor.heading2": shortcutBindingSchema.catch(defaults.shortcuts["editor.heading2"]),
        "editor.heading3": shortcutBindingSchema.catch(defaults.shortcuts["editor.heading3"]),
        "editor.heading4": shortcutBindingSchema.catch(defaults.shortcuts["editor.heading4"]),
        "editor.heading5": shortcutBindingSchema.catch(defaults.shortcuts["editor.heading5"]),
        "editor.heading6": shortcutBindingSchema.catch(defaults.shortcuts["editor.heading6"]),
        "editor.blockquote": shortcutBindingSchema.catch(defaults.shortcuts["editor.blockquote"]),
        "editor.bulletList": shortcutBindingSchema.catch(defaults.shortcuts["editor.bulletList"]),
        "editor.orderedList": shortcutBindingSchema.catch(defaults.shortcuts["editor.orderedList"]),
        "editor.codeBlock": shortcutBindingSchema.catch(defaults.shortcuts["editor.codeBlock"]),
        "editor.paragraph": shortcutBindingSchema.catch(defaults.shortcuts["editor.paragraph"]),
        "editor.bold": shortcutBindingSchema.catch(defaults.shortcuts["editor.bold"]),
        "editor.italic": shortcutBindingSchema.catch(defaults.shortcuts["editor.italic"]),
        "editor.strikethrough": shortcutBindingSchema.catch(
          defaults.shortcuts["editor.strikethrough"],
        ),
        "editor.inlineCode": shortcutBindingSchema.catch(defaults.shortcuts["editor.inlineCode"]),
      })
      .catch(defaults.shortcuts),
    markdown: z
      .object({
        codeBlock: z
          .object({
            showLineNumbers: z.boolean().catch(defaults.markdown.codeBlock.showLineNumbers),
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

  return DEFAULT_USER_PREFERENCES.appearance.locale;
}

export function createDefaultUserPreferences(locale: LocaleCode): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    appearance: {
      ...DEFAULT_USER_PREFERENCES.appearance,
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

export function normalizeUserPreferences(
  input: unknown,
  defaults: UserPreferences = DEFAULT_USER_PREFERENCES,
): UserPreferences {
  const result = createUserPreferencesNormalizerSchema(defaults).safeParse(input);

  if (!result.success) {
    return defaults;
  }

  return result.data;
}

export function normalizeUserPreferencesPatch(input: unknown): UserPreferencesPatch {
  return userPreferencesPatchSchema.parse(input);
}
