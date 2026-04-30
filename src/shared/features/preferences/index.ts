import type { z } from "zod";

import type { preferencesApi } from "./api";

export { preferencesApi } from "./api";
export {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  AUTO_ARCHIVE_DURATION_UNITS,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  AUTO_ARCHIVE_MIN_IDLE_MINUTES,
  convertAutoArchiveDurationUnit,
  isAutoArchiveDurationUnit,
  normalizeAutoArchiveIdleMinutes,
  toAutoArchiveDurationViewModel,
  toAutoArchiveIdleMinutes,
  type AutoArchiveDuration,
  type AutoArchiveDurationUnit,
} from "./auto-archive";
export {
  DEFAULT_AUTO_ARCHIVE_SETTINGS,
  DEFAULT_SETTINGS,
  FONT_SIZE_OPTIONS,
  LANGUAGE_OPTIONS,
  SETTINGS_SCHEMA_VERSION,
  appearanceSettingsSchema,
  autoArchiveSettingsSchema,
  fontSizeSchema,
  isFontSize,
  isLocaleCode,
  localeSchema,
  normalizeSettings,
  normalizeSettingsPatch,
  settingsPatchSchema,
  settingsSchema,
  shortcutActionSchema,
  shortcutBindingSchema,
  shortcutPreferencesSchema,
  type AutoArchiveSettings,
  type FontSize,
  type LanguageOption,
  type LocaleCode,
  type Settings,
  type SettingsPatch,
  type ShortcutAction,
  type ShortcutBinding,
  type ShortcutPreferences,
} from "./settings";

export type PreferencesSnapshot = z.infer<(typeof preferencesApi)["commands"]["read"]["response"]>;
