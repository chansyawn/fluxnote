import { Trans } from "@lingui/react/macro";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AlertTriangleIcon, RefreshCwIcon, XIcon } from "lucide-react";

import { toErrorMessage } from "@/features/error-boundary/error-utils";
import { Button } from "@/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/ui/components/item";

interface GlobalErrorContentProps {
  error: unknown;
  onRetry: () => void;
}

const appWindow = getCurrentWindow();

export function GlobalErrorContent({ error, onRetry }: GlobalErrorContentProps) {
  const handleExitApp = () => {
    void appWindow.destroy().catch((destroyError) => {
      console.error("Failed to destroy window, fallback to hide", destroyError);
      return appWindow.hide();
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
            FluxNote encountered an unexpected error. You can retry or exit the app.
          </Trans>
        </ItemDescription>
        <ItemDescription className="line-clamp-1 font-mono text-[11px] break-all">
          {toErrorMessage(error)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="ml-auto shrink-0 flex-col items-stretch">
        <Button className="gap-1" size="sm" variant="secondary" onClick={onRetry}>
          <RefreshCwIcon className="size-3" />
          <Trans id="error.global.retry">Retry</Trans>
        </Button>
        <Button className="gap-1" size="sm" variant="destructive" onClick={handleExitApp}>
          <XIcon className="size-3" />
          <Trans id="error.global.exit-app">Exit app</Trans>
        </Button>
      </ItemActions>
    </Item>
  );
}
