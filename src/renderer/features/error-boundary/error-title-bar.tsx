import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { getAppPlatform } from "@renderer/app/platform";
import { destroyWindow, hideWindow } from "@renderer/clients";
import { WindowCloseButton } from "@renderer/routes/-layout/window-close-button";
import { cn } from "@renderer/ui/lib/utils";

export function ErrorTitleBar() {
  const { i18n } = useLingui();
  const platform = getAppPlatform();
  const isWindows = platform === "win32";

  const closeButton = (
    <WindowCloseButton
      ariaLabel={i18n._({
        id: "error.global.exit-app",
        message: "Exit app",
      })}
      onClick={() => {
        void destroyWindow().catch((destroyError) => {
          console.error("Failed to destroy window, fallback to hide", destroyError);
          return hideWindow();
        });
      }}
    >
      <Trans id="error.global.exit-app">Exit app</Trans>
    </WindowCloseButton>
  );

  return (
    <header className={cn("z-20 mb-1 h-8 select-none pt-1 [-webkit-app-region:drag]")}>
      <div
        className={cn("relative z-10 flex h-full items-center gap-2", isWindows ? "ps-3" : "px-3")}
      >
        {!isWindows ? <div className="flex shrink-0 items-center gap-2">{closeButton}</div> : null}

        <div className="pointer-events-none flex min-w-0 items-center truncate text-sm font-medium">
          <Trans id="app.title">Fluxnotes</Trans>
        </div>

        {isWindows ? <div className="ms-auto flex shrink-0 items-center">{closeButton}</div> : null}
      </div>
    </header>
  );
}
