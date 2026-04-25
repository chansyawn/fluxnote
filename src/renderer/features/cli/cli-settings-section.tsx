import { Trans } from "@lingui/react/macro";
import { toAppInvokeError } from "@renderer/app/invoke";
import { queryClient } from "@renderer/app/query";
import { getCliStatus, installCli, uninstallCli } from "@renderer/clients";
import { Button } from "@renderer/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { TerminalIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function CliSettingsSection() {
  const { data: status, isLoading } = useQuery({
    queryKey: ["cli", "status"],
    queryFn: getCliStatus,
  });
  const [pending, setPending] = useState(false);

  const handleInstall = useCallback(async () => {
    setPending(true);
    try {
      await installCli();
      await queryClient.invalidateQueries({ queryKey: ["cli", "status"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setPending(false);
    }
  }, []);

  const handleUninstall = useCallback(async () => {
    setPending(true);
    try {
      await uninstallCli();
      await queryClient.invalidateQueries({ queryKey: ["cli", "status"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setPending(false);
    }
  }, []);

  const installed = status?.installed === true;
  const disabled = isLoading || pending;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">
          <Trans id="preferences.cli.title">Command Line</Trans>
        </h2>
        <p className="text-muted-foreground text-xs">
          <Trans id="preferences.cli.description">
            Use the flux command in your terminal to interact with FluxNote.
          </Trans>
        </p>
      </div>

      <div className="border-border/70 flex items-center justify-between rounded-md border p-3">
        <div className="flex items-center gap-2.5">
          <TerminalIcon className="text-muted-foreground size-4" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium">
              <Trans id="preferences.cli.path.label">flux command</Trans>
            </p>
            <p className="text-muted-foreground text-xs">
              {installed ? (
                <Trans id="preferences.cli.path.installed">Installed at /usr/local/bin/flux</Trans>
              ) : (
                <Trans id="preferences.cli.path.not-installed">Not installed in PATH</Trans>
              )}
            </p>
          </div>
        </div>

        {installed ? (
          <Button variant="outline" size="sm" disabled={disabled} onClick={handleUninstall}>
            <Trans id="preferences.cli.uninstall">Uninstall</Trans>
          </Button>
        ) : (
          <Button size="sm" disabled={disabled} onClick={handleInstall}>
            <Trans id="preferences.cli.install">Install</Trans>
          </Button>
        )}
      </div>
    </section>
  );
}
