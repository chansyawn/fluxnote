import { Button } from "@fluxnotes/ui/components/button";
import { Trans } from "@lingui/react/macro";
import { AppUpdateInstallDialog } from "@renderer/features/app-update/app-update-install-dialog";
import { useAppUpdateStatusQuery } from "@renderer/features/app-update/app-update-query";
import { CircleFadingArrowUpIcon } from "lucide-react";

export function AppUpdateTitlebarButton() {
  const { data: status } = useAppUpdateStatusQuery();

  if (status?.state !== "ready") {
    return null;
  }

  return (
    <AppUpdateInstallDialog
      status={status}
      trigger={
        <Button className="[-webkit-app-region:no-drag]" size="icon" variant="ghost">
          <CircleFadingArrowUpIcon />
          <span className="sr-only">
            <Trans id="app-update.titlebar.restart">Install app update</Trans>
          </span>
        </Button>
      }
    />
  );
}
