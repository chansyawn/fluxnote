import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@fluxnotes/ui/components/alert-dialog";
import { toast } from "@fluxnotes/ui/components/sonner";
import { Trans } from "@lingui/react/macro";
import {
  restartAndInstallAppUpdate,
  toAppInvokeError,
  type AppUpdateStatus,
} from "@renderer/clients";
import type { ReactElement } from "react";

type ReadyAppUpdateStatus = Extract<AppUpdateStatus, { state: "ready" }>;

interface AppUpdateInstallDialogProps {
  status: ReadyAppUpdateStatus;
  trigger: ReactElement;
}

export function AppUpdateInstallDialog({ status, trigger }: AppUpdateInstallDialogProps) {
  const versionLabel = status.availableVersion ?? status.releaseName;

  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans id="app-update.restart-dialog.title">Restart to update?</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {versionLabel ? (
              <Trans id="app-update.restart-dialog.description-version">
                Fluxnotes will restart and install version {versionLabel}.
              </Trans>
            ) : (
              <Trans id="app-update.restart-dialog.description">
                Fluxnotes will restart and install the downloaded update.
              </Trans>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans id="app-update.restart-dialog.later">Later</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              restartAndInstallAppUpdate().catch((error: unknown) => {
                toast.error(toAppInvokeError(error).message);
              });
            }}
          >
            <Trans id="app-update.restart-dialog.restart">Restart</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
