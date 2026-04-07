import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { NoteBlockPlaygroundPanel } from "@/routes/lab/-features/note-block-playground-panel";
import { SampleGreetPanel } from "@/routes/lab/-features/sample-greet-panel";
import { SampleSpecPanel } from "@/routes/lab/-features/sample-spec-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";

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

      <Tabs defaultValue="sample">
        <TabsList>
          <TabsTrigger value="sample">
            <Trans id="lab.tabs.sample">Sample</Trans>
          </TabsTrigger>
          <TabsTrigger value="playground">
            <Trans id="lab.tabs.playground">Playground</Trans>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sample" className="flex flex-col gap-4 pt-2">
          <SampleGreetPanel />
          <SampleSpecPanel />
        </TabsContent>

        <TabsContent value="playground" className="pt-2">
          <NoteBlockPlaygroundPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
