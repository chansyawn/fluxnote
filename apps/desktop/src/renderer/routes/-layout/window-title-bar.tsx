import { Button } from "@fluxnotes/ui/components/button";
import { HouseIcon, Settings2Icon } from "@fluxnotes/ui/icons/lucide";
import { cn } from "@fluxnotes/ui/lib/utils";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { getAppPlatform } from "@renderer/app/platform";
import { hideWindow } from "@renderer/clients";
import { AppUpdateTitlebarButton } from "@renderer/features/app-update/app-update-titlebar-button";
import { WindowCloseButton } from "@renderer/routes/-layout/window-close-button";
import { useLocation, useNavigate } from "@tanstack/react-router";

function HeaderActionButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const onPreferencesPage = location.pathname === "/preferences";

  return (
    <Button
      className="[-webkit-app-region:no-drag]"
      size="icon"
      variant="ghost"
      onClick={() => {
        void navigate({ to: onPreferencesPage ? "/" : "/preferences" });
      }}
    >
      {onPreferencesPage ? <HouseIcon /> : <Settings2Icon />}
      <span className="sr-only">
        {onPreferencesPage ? (
          <Trans id="header.go-home">Go home</Trans>
        ) : (
          <Trans id="header.open-preferences">Open preferences</Trans>
        )}
      </span>
    </Button>
  );
}

function HeaderCloseButton() {
  const { i18n } = useLingui();

  return (
    <WindowCloseButton
      ariaLabel={i18n._({
        id: "window.hide",
        message: "Hide window",
      })}
      onClick={() => {
        void hideWindow();
      }}
    >
      <Trans id="window.hide">Hide window</Trans>
    </WindowCloseButton>
  );
}

export function WindowTitleBar() {
  const platform = getAppPlatform();
  const isWindows = platform === "win32";

  return (
    <header className={cn("z-20 mb-1 h-8 select-none pt-1 [-webkit-app-region:drag]")}>
      <div
        className={cn("relative z-10 flex h-full items-center gap-2", isWindows ? "ps-3" : "px-3")}
      >
        {!isWindows ? (
          <div className="flex shrink-0 items-center gap-2">
            <HeaderCloseButton />
          </div>
        ) : null}

        <div className="pointer-events-none flex min-w-0 items-center truncate text-sm font-medium">
          <Trans id="app.title">Fluxnotes</Trans>
        </div>
        <AppUpdateTitlebarButton />

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div
            aria-hidden="true"
            className="[-webkit-app-region:no-drag]"
            id="titlebar-workspace-actions"
          />
          <HeaderActionButton />
          {isWindows ? <HeaderCloseButton /> : null}
        </div>
      </div>
    </header>
  );
}
