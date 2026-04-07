import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

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
          <TabsTrigger value="overview">
            <Trans id="lab.tabs.overview">Overview</Trans>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sample" className="flex flex-col gap-4 pt-2">
          <SampleGreetPanel />
          <SampleSpecPanel />
        </TabsContent>

        <TabsContent value="overview" className="pt-2">
          <section className="border-border/70 bg-card rounded-xl border p-4">
            <h2 className="text-sm font-semibold">
              <Trans id="lab.overview.title">About Lab</Trans>
            </h2>
            <p className="text-muted-foreground mt-2 text-xs">
              <Trans id="lab.overview.description">
                Use this workspace to host multiple demos and diagnostics in one place.
              </Trans>
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </section>
  );
}
