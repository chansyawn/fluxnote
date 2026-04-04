import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { SampleGreetPanel } from "@/routes/sample/-features/sample-greet-panel";
import { SampleSpecPanel } from "@/routes/sample/-features/sample-spec-panel";

export const Route = createFileRoute("/sample/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">
          <Trans id="sample.title">Infrastructure Sample</Trans>
        </h1>
        <p className="text-muted-foreground text-xs">
          <Trans id="sample.description">
            End-to-end example for clients, invoke, query, and i18n best practices.
          </Trans>
        </p>
      </div>
      <SampleGreetPanel />
      <SampleSpecPanel />
    </section>
  );
}
