import { Trans } from "@lingui/react/macro";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeftIcon, FlaskConicalIcon, HouseIcon, Settings2Icon, XIcon } from "lucide-react";

import { Button } from "@/ui/components/button";

const appWindow = getCurrentWindow();

function HeaderActionButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const onPreferencesPage = location.pathname === "/preferences";

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        void navigate({ to: onPreferencesPage ? "/" : "/preferences" });
      }}
    >
      {onPreferencesPage ? <ArrowLeftIcon /> : <Settings2Icon />}
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

function HeaderSampleButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const onSamplePage = location.pathname === "/sample";

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        void navigate({ to: onSamplePage ? "/" : "/sample" });
      }}
    >
      {onSamplePage ? <HouseIcon /> : <FlaskConicalIcon />}
      <span className="sr-only">
        {onSamplePage ? (
          <Trans id="header.open-sample">Open sample</Trans>
        ) : (
          <Trans id="header.go-sample">Go to sample</Trans>
        )}
      </span>
    </Button>
  );
}

function HeaderCloseButton() {
  return (
    <button
      aria-label="Hide window"
      className="group flex size-3 items-center justify-center rounded-full bg-red-500/85 text-red-950 transition-all hover:brightness-95 dark:bg-red-400/85 dark:text-red-950"
      data-window-control
      type="button"
      onClick={() => {
        void appWindow.hide();
      }}
    >
      <XIcon className="size-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
      <span className="sr-only">
        <Trans id="window.hide">Hide window</Trans>
      </span>
    </button>
  );
}

export function WindowTitleBar() {
  return (
    <header className="z-20 h-10 select-none">
      <div
        className="relative z-10 flex h-full items-center gap-2 px-3"
        onMouseDown={(event) => {
          if (event.buttons === 1 && event.detail === 1) void appWindow.startDragging();
        }}
      >
        <div className="flex shrink-0 items-center gap-2">
          <HeaderCloseButton />
        </div>

        <div className="pointer-events-none flex min-w-0 items-center truncate text-sm font-medium">
          <Trans id="app.title">FluxNote</Trans>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {import.meta.env.DEV ? <HeaderSampleButton /> : null}
          <HeaderActionButton />
        </div>
      </div>
    </header>
  );
}
