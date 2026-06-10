import { BLOCK_EDITOR_SHORTCUT_DEFAULTS } from "@fluxnotes/editor/contracts";
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
export const shortcutBindingSchema = z.string().nullable();

export const DEFAULT_SHORTCUTS = {
  "global.toggleWindow": "Alt+N",
  "global.externalEdit": "Mod+Alt+N",
  "workspace.createBlock": "Mod+N",
  "workspace.copyBlock": "Mod+Shift+C",
  "workspace.keepBlock": "Mod+K",
  "workspace.togglePinBlock": "Mod+T",
  "workspace.archiveBlock": "Mod+E",
  "workspace.deleteBlock": "Mod+D",
  "workspace.submitExternalEdit": "Mod+Enter",
  "workspace.cancelExternalEdit": "Mod+\\",
  ...BLOCK_EDITOR_SHORTCUT_DEFAULTS,
} as const;

const shortcutActions = Object.keys(DEFAULT_SHORTCUTS) as [
  keyof typeof DEFAULT_SHORTCUTS,
  ...(keyof typeof DEFAULT_SHORTCUTS)[],
];

export const shortcutActionSchema = z.enum(shortcutActions);

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

function createShortcutPreferencesSchema(defaults: Record<ShortcutAction, ShortcutBinding>) {
  return z.object(
    Object.fromEntries(
      shortcutActions.map((action) => [action, shortcutBindingSchema.catch(defaults[action])]),
    ) as Record<ShortcutAction, z.ZodCatch<typeof shortcutBindingSchema>>,
  );
}

export const shortcutPreferencesSchema = createShortcutPreferencesSchema(DEFAULT_SHORTCUTS);

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

export const externalEditPreferencesSchema = z.object({
  hideAfterSubmit: z.boolean().catch(true),
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
  .object(
    Object.fromEntries(
      shortcutActions.map((action) => [action, shortcutBindingSchema.optional()]),
    ) as Record<ShortcutAction, z.ZodOptional<typeof shortcutBindingSchema>>,
  )
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

const externalEditPreferencesPatchSchema = z
  .object({
    hideAfterSubmit: z.boolean().optional(),
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
  shortcuts: DEFAULT_SHORTCUTS,
  markdown: {
    codeBlock: defaultMarkdownCodeBlockPreferencesValue,
  },
  telemetry: {
    enabled: true,
  },
  appUpdate: {
    automaticChecksEnabled: true,
  },
  externalEdit: {
    hideAfterSubmit: true,
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
  externalEdit: externalEditPreferencesSchema.catch(defaultUserPreferencesValue.externalEdit),
});

export const userPreferencesPatchSchema = z
  .object({
    appearance: appearancePreferencesPatchSchema.optional(),
    autoArchive: autoArchivePreferencesPatchSchema.optional(),
    shortcuts: shortcutPreferencesPatchSchema.optional(),
    markdown: markdownPreferencesPatchSchema.optional(),
    telemetry: telemetryPreferencesPatchSchema.optional(),
    appUpdate: appUpdatePreferencesPatchSchema.optional(),
    externalEdit: externalEditPreferencesPatchSchema.optional(),
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
export type ExternalEditPreferences = z.infer<typeof externalEditPreferencesSchema>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = defaultUserPreferencesValue;
export const DEFAULT_AUTO_ARCHIVE_PREFERENCES: AutoArchivePreferences =
  DEFAULT_USER_PREFERENCES.autoArchive;
export const DEFAULT_MARKDOWN_CODE_BLOCK_PREFERENCES: MarkdownCodeBlockPreferences =
  DEFAULT_USER_PREFERENCES.markdown.codeBlock;
export const DEFAULT_TELEMETRY_PREFERENCES: TelemetryPreferences =
  DEFAULT_USER_PREFERENCES.telemetry;
export const DEFAULT_APP_UPDATE_PREFERENCES: AppUpdatePreferences =
  DEFAULT_USER_PREFERENCES.appUpdate;
export const DEFAULT_EXTERNAL_EDIT_PREFERENCES: ExternalEditPreferences =
  DEFAULT_USER_PREFERENCES.externalEdit;

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
    shortcuts: createShortcutPreferencesSchema(defaults.shortcuts).catch(defaults.shortcuts),
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
    externalEdit: z
      .object({
        hideAfterSubmit: z.boolean().catch(defaults.externalEdit.hideAfterSubmit),
      })
      .catch(defaults.externalEdit),
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
