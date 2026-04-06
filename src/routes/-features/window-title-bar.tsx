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
      className="flex size-7 items-center justify-center rounded-full border border-red-500/30 bg-red-500/15 text-red-700 transition-colors hover:bg-red-500/25 dark:border-red-400/30 dark:bg-red-400/15 dark:text-red-200 dark:hover:bg-red-400/25"
      type="button"
      onClick={() => {
        void appWindow.hide();
      }}
    >
      <XIcon className="size-3.5" />
      <span className="sr-only">
        <Trans id="window.hide">Hide window</Trans>
      </span>
    </button>
  );
}

export function WindowTitleBar() {
  return (
    <header className="border-border/70 bg-background/92 fixed inset-x-0 top-0 z-20 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
        <div className="flex shrink-0 items-center gap-3">
          <HeaderCloseButton />
        </div>

        <div
          className="flex min-w-0 flex-1 items-center gap-3"
          onMouseDown={(event) => {
            if (event.button !== 0) {
              return;
            }

            void appWindow.startDragging();
          }}
        >
          <p className="truncate text-sm font-medium">
            <Trans id="app.title">FluxNote</Trans>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {import.meta.env.DEV ? <HeaderSampleButton /> : null}
          <HeaderActionButton />
        </div>
      </div>
    </header>
  );
}
