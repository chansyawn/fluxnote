import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/ui/components/button";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto flex min-h-[40dvh] w-full max-w-xl flex-col justify-center gap-4">
      <h1 className="text-lg font-semibold">
        <Trans id="home.title">Welcome to FluxNote</Trans>
      </h1>
      <p className="text-muted-foreground text-sm">
        <Trans id="home.description">
          This is the lightweight home page. Explore /sample for infrastructure best practices.
        </Trans>
      </p>

      {import.meta.env.DEV ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void navigate({ to: "/sample" });
            }}
          >
            <Trans id="home.open-sample">Open sample page</Trans>
          </Button>
          <p className="text-muted-foreground text-xs">
            <Trans id="home.dev-tip">Visible in development mode only.</Trans>
          </p>
        </div>
      ) : null}
    </section>
  );
}
