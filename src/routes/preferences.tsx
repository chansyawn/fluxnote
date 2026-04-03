import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useDirectionState } from "@/app/direction";
import { isLocaleCode, useI18nState } from "@/app/i18n";
import { THEME_MODES, type ThemeMode, isThemeMode, useThemeState } from "@/app/theme";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Switch } from "@/ui/components/switch";

export const Route = createFileRoute("/preferences")({
  component: RouteComponent,
});

const themeLabelMap: Record<ThemeMode, ReactNode> = {
  light: <Trans id="preferences.theme.light">Light</Trans>,
  dark: <Trans id="preferences.theme.dark">Dark</Trans>,
  system: <Trans id="preferences.theme.system">System</Trans>,
};

function RouteComponent() {
  const { locale, setLocale, localeOptions, isPseudoLocale } = useI18nState();
  const { themeMode, setThemeMode } = useThemeState();
  const { rtlEnabled, setRtlEnabled } = useDirectionState();

  const showRtlSwitch = import.meta.env.DEV && isPseudoLocale;
  const languageItems = localeOptions.map((localeOption) => ({
    value: localeOption.key,
    label: localeOption.name,
  }));
  const themeItems = THEME_MODES.map((mode) => ({
    value: mode,
    label: themeLabelMap[mode],
  }));

  return (
    <section className="border-border/70 bg-card mx-auto w-full max-w-xl rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">
          <Trans id="preferences.title">Preferences</Trans>
        </h1>
        <p className="text-muted-foreground text-xs">
          <Trans id="preferences.description">Configure language and appearance.</Trans>
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium">
            <Trans id="preferences.language.label">Language</Trans>
          </span>
          <Select
            items={languageItems}
            value={locale}
            onValueChange={(value) => {
              if (value && isLocaleCode(value)) {
                setLocale(value);
              }
            }}
          >
            <SelectTrigger className="w-full">
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
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium">
            <Trans id="preferences.theme.label">Theme</Trans>
          </span>
          <Select
            items={themeItems}
            value={themeMode}
            onValueChange={(value) => {
              if (value && isThemeMode(value)) {
                setThemeMode(value);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectGroup>
                {THEME_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {themeLabelMap[mode]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>

        {showRtlSwitch ? (
          <div className="border-border/70 flex items-center justify-between rounded-md border p-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium">
                <Trans id="preferences.rtl.label">Right-to-left layout</Trans>
              </p>
              <p className="text-muted-foreground text-xs">
                <Trans id="preferences.rtl.description">
                  Available only when pseudo locale is selected.
                </Trans>
              </p>
            </div>
            <Switch
              checked={rtlEnabled}
              onCheckedChange={(checked) => {
                setRtlEnabled(checked);
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
