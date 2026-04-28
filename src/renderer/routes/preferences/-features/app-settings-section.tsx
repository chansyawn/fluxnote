import { Trans } from "@lingui/react/macro";
import { useI18nState } from "@renderer/app/i18n";
import { toAppInvokeError } from "@renderer/app/invoke";
import { isLocaleCode } from "@renderer/app/preferences/preferences-schema";
import { queryClient } from "@renderer/app/query";
import { getCliStatus, installCli, uninstallCli } from "@renderer/clients";
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
import { useQuery } from "@tanstack/react-query";
import { LanguagesIcon, TerminalIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function AppSettingsSection() {
  const { locale, setLocale, localeOptions } = useI18nState();
  const { data: cliStatus, isLoading: isCliStatusLoading } = useQuery({
    queryKey: ["cli", "status"],
    queryFn: getCliStatus,
  });
  const [isCliPending, setIsCliPending] = useState(false);
  const languageItems = localeOptions.map((localeOption) => ({
    value: localeOption.key,
    label: localeOption.name,
  }));
  const cliInstalled = cliStatus?.installed === true;
  const cliDisabled = isCliStatusLoading || isCliPending;

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
            cliInstalled ? (
              <Button
                disabled={cliDisabled}
                size="sm"
                variant="outline"
                onClick={handleCliUninstall}
              >
                <Trans id="preferences.cli.uninstall">Uninstall</Trans>
              </Button>
            ) : (
              <Button disabled={cliDisabled} size="sm" onClick={handleCliInstall}>
                <Trans id="preferences.cli.install">Install</Trans>
              </Button>
            )
          }
          description={
            <Trans id="preferences.cli.path.description">
              Install the flux command for terminal workflows.
            </Trans>
          }
          icon={TerminalIcon}
          label={<Trans id="preferences.cli.path.label">flux command</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
