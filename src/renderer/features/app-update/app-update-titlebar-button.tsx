import { Trans } from "@lingui/react/macro";
import { restartAndInstallAppUpdate, toAppInvokeError } from "@renderer/clients";
import { useAppUpdateStatusQuery } from "@renderer/features/app-update/app-update-query";
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
} from "@renderer/ui/components/alert-dialog";
import { Button } from "@renderer/ui/components/button";
import { CircleFadingArrowUpIcon } from "lucide-react";
import { toast } from "sonner";

export function AppUpdateTitlebarButton() {
  const { data: status } = useAppUpdateStatusQuery();

  if (status?.state !== "ready") {
    return null;
  }

  const versionLabel = status.availableVersion ?? status.releaseName;

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button className="[-webkit-app-region:no-drag]" size="icon" variant="ghost">
            <CircleFadingArrowUpIcon />
            <span className="sr-only">
              <Trans id="app-update.titlebar.restart">Install app update</Trans>
            </span>
          </Button>
        }
      />
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
