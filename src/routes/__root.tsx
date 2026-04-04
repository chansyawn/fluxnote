import { Trans } from "@lingui/react/macro";
import { Outlet, createRootRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, FlaskConicalIcon, HouseIcon, Settings2Icon } from "lucide-react";

import { Button } from "@/ui/components/button";

export const Route = createRootRoute({
  component: RootComponent,
});

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

function RootComponent() {
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border/70 border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <p className="font-medium">
            <Trans id="app.title">FluxNote</Trans>
          </p>
          <div className="flex items-center gap-1">
            {import.meta.env.DEV ? <HeaderSampleButton /> : null}
            <HeaderActionButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
