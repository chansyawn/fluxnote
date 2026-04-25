import { Trans } from "@lingui/react/macro";
import { useI18nState } from "@renderer/app/i18n";
import { isLocaleCode } from "@renderer/app/preferences/preferences-schema";
import { AutoArchiveSettingsSection } from "@renderer/features/auto-archive/auto-archive-settings-section";
import { CliSettingsSection } from "@renderer/features/cli/cli-settings-section";
import { ShortcutSettingsSection } from "@renderer/features/shortcut/shortcut-settings-section";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/ui/components/select";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preferences")({
  component: RouteComponent,
});

function RouteComponent() {
  const { locale, setLocale, localeOptions } = useI18nState();
  const languageItems = localeOptions.map((localeOption) => ({
    value: localeOption.key,
    label: localeOption.name,
  }));

  return (
    <section className="border-border/70 bg-card mx-auto w-full max-w-xl rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">
          <Trans id="preferences.title">Preferences</Trans>
        </h1>
        <p className="text-muted-foreground text-xs">
          <Trans id="preferences.description">
            Configure language, auto-archive, and shortcuts.
          </Trans>
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

        <AutoArchiveSettingsSection />
        <ShortcutSettingsSection />
        <CliSettingsSection />
      </div>
    </section>
  );
}
