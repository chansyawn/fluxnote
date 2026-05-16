import { Trans } from "@lingui/react/macro";
import { useI18nState } from "@renderer/app/i18n";
import { queryClient } from "@renderer/app/query";
import { getCliStatus, installCli, toAppInvokeError, uninstallCli } from "@renderer/clients";
import { useFontSizePreference } from "@renderer/features/preferences/preferences-query";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { Button } from "@renderer/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/ui/components/select";
import { FONT_SIZE_OPTIONS, isFontSize, isLocaleCode } from "@shared/features/preferences/settings";
import { useQuery } from "@tanstack/react-query";
import { LanguagesIcon, TerminalIcon, TypeIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function AppSettingsSection() {
  const { locale, setLocale, localeOptions } = useI18nState();
  const { fontSize, setFontSize } = useFontSizePreference();
  const { data: cliStatus, isLoading: isCliStatusLoading } = useQuery({
    queryKey: ["cli", "status"],
    queryFn: getCliStatus,
  });
  const [isCliPending, setIsCliPending] = useState(false);
  const languageItems = localeOptions.map((localeOption) => ({
    value: localeOption.key,
    label: localeOption.name,
  }));
  const fontSizeItems = FONT_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: String(size),
  }));
  const cliInstalled = cliStatus?.installed === true;
  const cliDisabled = isCliStatusLoading || isCliPending;
  const canInstallCli = cliStatus?.canInstall === true;
  const canUninstallCli = cliStatus?.canUninstall === true;

  const handleCliInstall = useCallback(async () => {
    setIsCliPending(true);
    try {
      await installCli();
      await queryClient.invalidateQueries({ queryKey: ["cli", "status"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setIsCliPending(false);
    }
  }, []);

  const handleCliUninstall = useCallback(async () => {
    setIsCliPending(true);
    try {
      await uninstallCli();
      await queryClient.invalidateQueries({ queryKey: ["cli", "status"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setIsCliPending(false);
    }
  }, []);

  return (
    <SettingsSection title={<Trans id="preferences.app.title">App</Trans>}>
      <SettingsGroup>
        <SettingsRow
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
          icon={LanguagesIcon}
          label={<Trans id="preferences.language.label">Language</Trans>}
        />
        <SettingsRow
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
          icon={TypeIcon}
          label={<Trans id="preferences.font-size.label">Font size</Trans>}
        />
        <SettingsRow
          control={
            cliInstalled ? (
              <Button
                disabled={cliDisabled || !canUninstallCli}
                size="sm"
                variant="outline"
                onClick={handleCliUninstall}
              >
                <Trans id="preferences.cli.uninstall">Uninstall</Trans>
              </Button>
            ) : (
              <Button disabled={cliDisabled || !canInstallCli} size="sm" onClick={handleCliInstall}>
                <Trans id="preferences.cli.install">Install</Trans>
              </Button>
            )
          }
          description={
            <Trans id="preferences.cli.path.description">
              Install the Flux CLI for terminal workflows. After installation, run `flux --help` to
              view available commands and usage.
            </Trans>
          }
          icon={TerminalIcon}
          label={<Trans id="preferences.cli.path.label">Flux CLI</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
