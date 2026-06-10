import { Button } from "@fluxnotes/ui/components/button";
import { toast } from "@fluxnotes/ui/components/sonner";
import { Switch } from "@fluxnotes/ui/components/switch";
import { AccessibilityIcon, EyeOffIcon, TerminalIcon } from "@fluxnotes/ui/icons/lucide";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  getCliStatus,
  getSystemPermissionStatus,
  installCli,
  onWindowFocusChanged,
  openSystemPermissionSettings,
  requestSystemPermission,
  toAppInvokeError,
  uninstallCli,
  type SystemPermissionStatus,
} from "@renderer/clients";
import { useExternalEditPreference } from "@renderer/features/preferences/preferences-query";
import {
  PreferencesGroup,
  PreferencesRow,
  PreferencesSection,
} from "@renderer/routes/preferences/-features/preferences-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const ACCESSIBILITY_PERMISSION_REQUEST = { permission: "macos_accessibility" } as const;
const ACCESSIBILITY_PERMISSION_QUERY_KEY = [
  "system-permissions",
  ACCESSIBILITY_PERMISSION_REQUEST.permission,
] as const;

function getAccessibilityStatusLabel(status: SystemPermissionStatus | undefined) {
  if (!status) {
    return <Trans id="preferences.accessibility.status.permission-needed">Permission needed</Trans>;
  }
  if (!status.supported) {
    return <Trans id="preferences.accessibility.status.macos-only">macOS only</Trans>;
  }
  if (status.granted) {
    return <Trans id="preferences.accessibility.status.ready">Ready</Trans>;
  }
  return <Trans id="preferences.accessibility.status.permission-needed">Permission needed</Trans>;
}

export function ExternalEditPreferencesSection() {
  const { i18n } = useLingui();
  const { externalEdit, patchExternalEdit } = useExternalEditPreference();
  const queryClient = useQueryClient();
  const { data: cliStatus, isLoading: isCliStatusLoading } = useQuery({
    queryKey: ["cli", "status"],
    queryFn: getCliStatus,
  });
  const { data: accessibilityStatus, isLoading: isAccessibilityStatusLoading } = useQuery({
    queryKey: ACCESSIBILITY_PERMISSION_QUERY_KEY,
    queryFn: () => getSystemPermissionStatus(ACCESSIBILITY_PERMISSION_REQUEST),
  });
  const [isCliPending, setIsCliPending] = useState(false);
  const [isAccessibilityPending, setIsAccessibilityPending] = useState(false);
  const [showAccessibilitySettingsAction, setShowAccessibilitySettingsAction] = useState(false);
  const cliInstalled = cliStatus?.installed === true;
  const cliDisabled = isCliStatusLoading || isCliPending;
  const canInstallCli = cliStatus?.canInstall === true;
  const canUninstallCli = cliStatus?.canUninstall === true;
  const accessibilitySupported = accessibilityStatus?.supported === true;
  const accessibilityGranted = accessibilityStatus?.granted === true;
  const accessibilityDisabled =
    isAccessibilityStatusLoading || isAccessibilityPending || !accessibilitySupported;

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
  }, [queryClient]);

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
  }, [queryClient]);

  const refreshAccessibilityStatus = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ACCESSIBILITY_PERMISSION_QUERY_KEY });
  }, [queryClient]);

  const handleAccessibilityRequest = useCallback(async () => {
    setIsAccessibilityPending(true);
    try {
      const status = await requestSystemPermission(ACCESSIBILITY_PERMISSION_REQUEST);
      queryClient.setQueryData(ACCESSIBILITY_PERMISSION_QUERY_KEY, status);
      setShowAccessibilitySettingsAction(status.supported && !status.granted);
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setIsAccessibilityPending(false);
    }
  }, [queryClient]);

  const handleAccessibilityOpenSettings = useCallback(async () => {
    setIsAccessibilityPending(true);
    try {
      await openSystemPermissionSettings(ACCESSIBILITY_PERMISSION_REQUEST);
      await refreshAccessibilityStatus();
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setIsAccessibilityPending(false);
    }
  }, [refreshAccessibilityStatus]);

  useEffect(() => {
    return onWindowFocusChanged((focused) => {
      if (focused) {
        void refreshAccessibilityStatus();
      }
    });
  }, [refreshAccessibilityStatus]);

  return (
    <PreferencesSection title={<Trans id="preferences.external-edit.title">External edit</Trans>}>
      <PreferencesGroup>
        <PreferencesRow
          control={
            <Switch
              aria-label={i18n._({
                id: "preferences.external-edit.hide-after-submit.label",
                message: "Hide Fluxnotes after submit",
              })}
              checked={externalEdit.hideAfterSubmit}
              onCheckedChange={(hideAfterSubmit) => {
                patchExternalEdit({ hideAfterSubmit });
              }}
            />
          }
          description={
            <Trans id="preferences.external-edit.hide-after-submit.description">
              Hide the Fluxnotes window after an External edit is submitted successfully.
            </Trans>
          }
          icon={<EyeOffIcon />}
          label={
            <Trans id="preferences.external-edit.hide-after-submit.label">
              Hide Fluxnotes after submit
            </Trans>
          }
        />
        <PreferencesRow
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
          icon={<TerminalIcon />}
          label={<Trans id="preferences.cli.path.label">Flux CLI</Trans>}
        />
        <PreferencesRow
          control={
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {getAccessibilityStatusLabel(accessibilityStatus)}
              </span>
              {!accessibilityGranted ? (
                <Button
                  disabled={accessibilityDisabled}
                  size="sm"
                  variant={showAccessibilitySettingsAction ? "outline" : "default"}
                  onClick={
                    showAccessibilitySettingsAction
                      ? handleAccessibilityOpenSettings
                      : handleAccessibilityRequest
                  }
                >
                  {showAccessibilitySettingsAction ? (
                    <Trans id="preferences.accessibility.open-settings">Open Settings</Trans>
                  ) : (
                    <Trans id="preferences.accessibility.allow">Allow</Trans>
                  )}
                </Button>
              ) : null}
            </div>
          }
          description={
            <Trans id="preferences.accessibility.description">
              Allow Fluxnotes to read and update the focused text field in other Mac apps for
              External edit.
            </Trans>
          }
          icon={<AccessibilityIcon />}
          label={<Trans id="preferences.accessibility.label">Accessibility</Trans>}
        />
      </PreferencesGroup>
    </PreferencesSection>
  );
}
