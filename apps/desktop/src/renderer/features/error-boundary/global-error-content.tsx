import { Button } from "@fluxnotes/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@fluxnotes/ui/components/item";
import { toast } from "@fluxnotes/ui/components/sonner";
import { AlertTriangleIcon, BugIcon, RefreshCwIcon, XIcon } from "@fluxnotes/ui/icons/lucide";
import { Trans } from "@lingui/react/macro";
import {
  destroyWindow,
  hideWindow,
  openExternalUrl,
  restartApp,
  toAppInvokeError,
} from "@renderer/clients";
import { toErrorMessage } from "@renderer/features/error-boundary/error-utils";

const GITHUB_NEW_ISSUE_URL = "https://github.com/chansyawn/fluxnotes/issues/new";

interface GlobalErrorContentProps {
  error: unknown;
}

export function GlobalErrorContent({ error }: GlobalErrorContentProps) {
  const handleReportIssue = () => {
    openExternalUrl({ url: GITHUB_NEW_ISSUE_URL }).catch((openError: unknown) => {
      toast.error(toAppInvokeError(openError).message);
    });
  };

  const handleRestartApp = () => {
    restartApp().catch((restartError: unknown) => {
      toast.error(toAppInvokeError(restartError).message);
    });
  };

  const handleExitApp = () => {
    void destroyWindow().catch((destroyError) => {
      console.error("Failed to destroy window, fallback to hide", destroyError);
      return hideWindow();
    });
  };

  return (
    <Item className="bg-card w-full rounded-2xl p-4" variant="outline">
      <ItemMedia
        className="bg-destructive/15 text-destructive mt-0.5 rounded-lg p-2"
        variant="icon"
      >
        <AlertTriangleIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Trans id="error.global.title">Something went wrong</Trans>
        </ItemTitle>
        <ItemDescription className="line-clamp-none leading-relaxed">
          <Trans id="error.global.description">
            Fluxnotes encountered an unexpected error. You can report the issue or restart the app.
          </Trans>
        </ItemDescription>
        <ItemDescription className="line-clamp-none font-mono text-xs break-all">
          {toErrorMessage(error)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="ml-auto shrink-0 flex-col self-start">
        <Button className="gap-1" size="sm" variant="outline" onClick={handleReportIssue}>
          <BugIcon className="size-3" />
          <Trans id="error.global.report-issue">Report issue</Trans>
        </Button>
        <Button className="gap-1" size="sm" variant="outline" onClick={handleRestartApp}>
          <RefreshCwIcon className="size-3" />
          <Trans id="error.global.restart-app">Restart app</Trans>
        </Button>
        <Button className="gap-1" size="sm" variant="destructive" onClick={handleExitApp}>
          <XIcon className="size-3" />
          <Trans id="error.global.exit-app">Exit app</Trans>
        </Button>
        {import.meta.env.DEV ? (
          <Button
            className="gap-1"
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCwIcon className="size-3" />
            <Trans id="error.global.reload-window">Reload window</Trans>
          </Button>
        ) : null}
      </ItemActions>
    </Item>
  );
}
