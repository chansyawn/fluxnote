import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { openExternalUrl, toAppInvokeError } from "@renderer/clients";
import { AppUpdateInstallDialog } from "@renderer/features/app-update/app-update-install-dialog";
import {
  useAppUpdateStatusQuery,
  useManualAppUpdateCheckMutation,
} from "@renderer/features/app-update/app-update-query";
import {
  useAppUpdatePreference,
  useTelemetryPreference,
} from "@renderer/features/preferences/preferences-query";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { BrandIcon } from "@renderer/ui/components/brand-icon";
import { Button } from "@renderer/ui/components/button";
import { Switch } from "@renderer/ui/components/switch";
import {
  BadgeInfoIcon,
  BugIcon,
  CircleFadingArrowUpIcon,
  HomeIcon,
  RefreshCwIcon,
  SendIcon,
} from "lucide-react";
import { useCallback } from "react";
import { siGithub } from "simple-icons";
import { toast } from "sonner";

const GITHUB_REPOSITORY_URL = "https://github.com/chansyawn/fluxnotes";
const GITHUB_ISSUES_URL = "https://github.com/chansyawn/fluxnotes/issues";

export function AboutSettingsSection() {
  const { i18n } = useLingui();
  const { telemetry, patchTelemetry } = useTelemetryPreference();
  const { appUpdate, patchAppUpdate } = useAppUpdatePreference();
  const { data: appUpdateStatus } = useAppUpdateStatusQuery();
  const appUpdateCheckMutation = useManualAppUpdateCheckMutation();
  const appUpdateChecking =
    appUpdateStatus?.state === "checking" || appUpdateCheckMutation.isPending;
  const appUpdateDownloading = appUpdateStatus?.state === "downloading";
  const appUpdateReadyStatus = appUpdateStatus?.state === "ready" ? appUpdateStatus : null;
  const appUpdateSupported = appUpdateStatus?.isSupported === true;
  const appUpdateUnsupportedReason =
    appUpdateStatus?.state === "unsupported" ? appUpdateStatus.unsupportedReason : null;
  const currentVersion = appUpdateStatus?.currentVersion ?? "...";

  const handleOpenExternalUrl = useCallback((url: string) => {
    openExternalUrl({ url }).catch((error: unknown) => {
      toast.error(toAppInvokeError(error).message);
    });
  }, []);

  return (
    <SettingsSection title={<Trans id="preferences.about.title">About</Trans>}>
      <SettingsGroup>
        <SettingsRow
          control={
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm tabular-nums">{currentVersion}</span>
              {appUpdateReadyStatus ? (
                <AppUpdateInstallDialog
                  status={appUpdateReadyStatus}
                  trigger={
                    <Button size="sm">
                      <CircleFadingArrowUpIcon />
                      <Trans id="preferences.app-update.install">Update</Trans>
                    </Button>
                  }
                />
              ) : appUpdateDownloading ? (
                <Button disabled size="sm" variant="outline">
                  <RefreshCwIcon className="animate-spin" />
                  <Trans id="preferences.app-update.downloading">Downloading</Trans>
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
          icon={<BadgeInfoIcon />}
          label={<Trans id="preferences.app-version.label">Version</Trans>}
        />
        <SettingsRow
          control={
            <Switch
              aria-label={i18n._({
                id: "preferences.app-update.auto-check.label",
                message: "Auto updates",
              })}
              checked={appUpdate.automaticChecksEnabled}
              disabled={!appUpdateSupported}
              onCheckedChange={(automaticChecksEnabled) => {
                patchAppUpdate({ automaticChecksEnabled });
              }}
            />
          }
          description={
            appUpdateUnsupportedReason === "not-packaged" ? (
              <Trans id="preferences.app-update.auto-check.unavailable-development">
                App updates are unavailable while Fluxnotes is running from a development build.
              </Trans>
            ) : appUpdateUnsupportedReason === "platform" ? (
              <Trans id="preferences.app-update.auto-check.unavailable-platform">
                App updates are unavailable on this platform.
              </Trans>
            ) : (
              <Trans id="preferences.app-update.auto-check.description">
                Fluxnotes checks for updates in the background and shows an install option when one
                is ready.
              </Trans>
            )
          }
          icon={<RefreshCwIcon />}
          label={<Trans id="preferences.app-update.auto-check.label">Auto updates</Trans>}
        />
        <SettingsRow
          control={
            <Switch
              aria-label={i18n._({
                id: "preferences.telemetry.label",
                message: "Telemetry",
              })}
              checked={telemetry.enabled}
              onCheckedChange={(enabled) => {
                patchTelemetry({ enabled });
              }}
            />
          }
          description={
            <Trans id="preferences.telemetry.description">
              Shares anonymous diagnostics and crash reports. Notes, tags, file paths, and clipboard
              data are never included.
            </Trans>
          }
          icon={<SendIcon />}
          label={<Trans id="preferences.telemetry.label">Telemetry</Trans>}
        />
        <SettingsRow
          control={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenExternalUrl(GITHUB_REPOSITORY_URL)}
              >
                <HomeIcon />
                <Trans id="preferences.github.repository.open">Repository</Trans>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenExternalUrl(GITHUB_ISSUES_URL)}
              >
                <BugIcon />
                <Trans id="preferences.github.issues.open">Issues</Trans>
              </Button>
            </div>
          }
          icon={<BrandIcon icon={siGithub} />}
          label={<Trans id="preferences.github.label">GitHub</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
