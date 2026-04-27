import { Trans } from "@lingui/react/macro";
import { NoteBlockPlaygroundPanel } from "@renderer/routes/lab/-features/note-block-playground-panel";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">
          <Trans id="lab.title">Lab</Trans>
        </h1>
        <p className="text-muted-foreground text-xs">
          <Trans id="lab.description">
            Experiment area for infrastructure and integration demos.
          </Trans>
        </p>
      </div>

      <div className="pt-2">
        <NoteBlockPlaygroundPanel />
      </div>
    </section>
  );
}
