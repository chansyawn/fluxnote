import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fluxnotes/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@fluxnotes/ui/components/tabs";
import {
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
  TypeIcon,
  type LucideIcon,
} from "@fluxnotes/ui/icons/lucide";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useI18nState } from "@renderer/app/i18n";
import {
  useFontSizePreference,
  useThemePreference,
} from "@renderer/features/preferences/preferences-query";
import {
  PreferencesGroup,
  PreferencesRow,
  PreferencesSection,
} from "@renderer/routes/preferences/-features/preferences-list";
import {
  FONT_SIZE_OPTIONS,
  isFontSize,
  isLocaleCode,
  isThemePreference,
  type ThemePreference,
} from "@shared/features/preferences/user-preferences";

export function AppPreferencesSection() {
  const { i18n } = useLingui();
  const { locale, setLocale, localeOptions } = useI18nState();
  const { fontSize, setFontSize } = useFontSizePreference();
  const { theme, setTheme } = useThemePreference();
  const languageItems = localeOptions.map((localeOption) => ({
    value: localeOption.key,
    label: localeOption.name,
  }));
  const fontSizeItems = FONT_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: String(size),
  }));
  const themeItems: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
    {
      value: "system",
      label: i18n._({ id: "preferences.theme.system", message: "System" }),
      icon: MonitorIcon,
    },
    {
      value: "light",
      label: i18n._({ id: "preferences.theme.light", message: "Light" }),
      icon: SunIcon,
    },
    {
      value: "dark",
      label: i18n._({ id: "preferences.theme.dark", message: "Dark" }),
      icon: MoonIcon,
    },
  ];

  return (
    <PreferencesSection title={<Trans id="preferences.app.title">App</Trans>}>
      <PreferencesGroup>
        <PreferencesRow
          control={
            <Tabs
              value={theme}
              onValueChange={(value) => {
                if (value && isThemePreference(value)) {
                  setTheme(value);
                }
              }}
            >
              <TabsList>
                {themeItems.map((themeItem) => {
                  const ThemeItemIcon = themeItem.icon;

                  return (
                    <TabsTrigger
                      key={themeItem.value}
                      aria-label={themeItem.label}
                      value={themeItem.value}
                    >
                      <ThemeItemIcon />
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          }
          icon={<PaletteIcon />}
          label={<Trans id="preferences.theme.label">Theme</Trans>}
        />
        <PreferencesRow
          control={
            <Select
              items={languageItems}
              value={locale}
              onValueChange={(value) => {
                if (value && isLocaleCode(value)) {
                  setLocale(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                <SelectGroup>
                  {localeOptions.map((localeOption) => (
                    <SelectItem key={localeOption.key} value={localeOption.key}>
                      {localeOption.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          }
          icon={<LanguagesIcon />}
          label={<Trans id="preferences.language.label">Language</Trans>}
        />
        <PreferencesRow
          control={
            <Select
              items={fontSizeItems}
              value={String(fontSize)}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                const parsed = Number(value);
                if (isFontSize(parsed)) {
                  setFontSize(parsed);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                <SelectGroup>
                  {FONT_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          }
          icon={<TypeIcon />}
          label={<Trans id="preferences.font-size.label">Font size</Trans>}
        />
      </PreferencesGroup>
    </PreferencesSection>
  );
}
