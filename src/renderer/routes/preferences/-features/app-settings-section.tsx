import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useI18nState } from "@renderer/app/i18n";
import { queryClient } from "@renderer/app/query";
import { getCliStatus, installCli, toAppInvokeError, uninstallCli } from "@renderer/clients";
import { AppUpdateInstallDialog } from "@renderer/features/app-update/app-update-install-dialog";
import {
  useAppUpdateStatusQuery,
  useManualAppUpdateCheckMutation,
} from "@renderer/features/app-update/app-update-query";
import {
  useFontSizePreference,
  useTelemetryPreference,
  useThemePreference,
} from "@renderer/features/preferences/preferences-query";
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
import { Switch } from "@renderer/ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@renderer/ui/components/tabs";
import {
  FONT_SIZE_OPTIONS,
  isFontSize,
  isLocaleCode,
  isThemePreference,
  type ThemePreference,
} from "@shared/features/preferences/settings";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeInfoIcon,
  CircleFadingArrowUpIcon,
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SendIcon,
  RefreshCwIcon,
  SunIcon,
  TerminalIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function AppSettingsSection() {
  const { i18n } = useLingui();
  const { locale, setLocale, localeOptions } = useI18nState();
  const { fontSize, setFontSize } = useFontSizePreference();
  const { theme, setTheme } = useThemePreference();
  const { telemetry, patchTelemetry } = useTelemetryPreference();
  const { data: appUpdateStatus } = useAppUpdateStatusQuery();
  const appUpdateCheckMutation = useManualAppUpdateCheckMutation();
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
  const cliInstalled = cliStatus?.installed === true;
  const cliDisabled = isCliStatusLoading || isCliPending;
  const canInstallCli = cliStatus?.canInstall === true;
  const canUninstallCli = cliStatus?.canUninstall === true;
  const appUpdateChecking =
    appUpdateStatus?.state === "checking" || appUpdateCheckMutation.isPending;
  const appUpdateDownloading = appUpdateStatus?.state === "downloading";
  const appUpdateReady = appUpdateStatus?.state === "ready";
  const appUpdateSupported = appUpdateStatus?.isSupported !== false;
  const appUpdateTargetVersion = appUpdateStatus?.availableVersion ?? appUpdateStatus?.releaseName;

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
          icon={PaletteIcon}
          label={<Trans id="preferences.theme.label">Theme</Trans>}
        />
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
            <Switch
              aria-label={i18n._({
                id: "preferences.telemetry.label",
                message: "Share anonymous diagnostics",
              })}
              checked={telemetry.enabled}
              onCheckedChange={(enabled) => {
                patchTelemetry({ enabled });
              }}
            />
          }
          description={
            <Trans id="preferences.telemetry.description">
              Share anonymous diagnostics and crash reports. Block content, tags, file paths, and
              clipboard data are never included.
            </Trans>
          }
          icon={SendIcon}
          label={<Trans id="preferences.telemetry.label">Share anonymous diagnostics</Trans>}
        />
        <SettingsRow
          control={
            <div className="flex items-center gap-2">
              {appUpdateReady && appUpdateStatus ? (
                <AppUpdateInstallDialog
                  status={appUpdateStatus}
                  trigger={
                    <Button size="sm">
                      <CircleFadingArrowUpIcon />
                      {appUpdateTargetVersion ? (
                        <Trans id="preferences.app-update.install-version">
                          Update to {appUpdateTargetVersion}
                        </Trans>
                      ) : (
                        <Trans id="preferences.app-update.install">Install update</Trans>
                      )}
                    </Button>
                  }
                />
              ) : appUpdateStatus ? (
                <span className="text-muted-foreground text-sm tabular-nums">
                  {appUpdateStatus.currentVersion}
                </span>
              ) : null}
              {appUpdateDownloading ? (
                <Button disabled size="sm" variant="outline">
                  <RefreshCwIcon className="animate-spin" />
                  <Trans id="preferences.app-update.downloading">Downloading update</Trans>
                </Button>
              ) : (
                <Button
                  disabled={!appUpdateSupported || appUpdateChecking}
                  size="sm"
                  variant="outline"
                  onClick={() => appUpdateCheckMutation.mutate()}
                >
                  {appUpdateChecking ? (
                    <RefreshCwIcon className="animate-spin" />
                  ) : (
                    <RefreshCwIcon />
                  )}
                  <Trans id="preferences.app-update.check">Check</Trans>
                </Button>
              )}
            </div>
          }
          icon={BadgeInfoIcon}
          label={<Trans id="preferences.app-update.label">Version information</Trans>}
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
