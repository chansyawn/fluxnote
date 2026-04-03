import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/ui/components/button";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center">
      <Button>
        <Trans id="hello-fluxnote">Hello FluxNote</Trans>
      </Button>
    </div>
  );
}
