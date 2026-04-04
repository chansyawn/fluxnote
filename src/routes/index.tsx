import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppInvokeError } from "@/app/invoke";
import { greet } from "@/clients";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const userName = "FluxNote";
  const greetQuery = useQuery({
    queryKey: ["greet", userName],
    queryFn: () => greet({ name: userName }),
  });

  return (
    <section className="mx-auto flex min-h-[40dvh] w-full max-w-xl flex-col justify-center gap-3">
      <h1 className="text-lg font-semibold">
        <Trans id="home.backend-response.title">Backend response</Trans>
      </h1>

      {greetQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">
          <Trans id="home.backend-response.loading">Loading greeting from Rust backend...</Trans>
        </p>
      ) : null}

      {greetQuery.isError ? (
        <div className="rounded-md border border-red-400/70 bg-red-50 p-3 text-sm text-red-800">
          <p>
            <Trans id="home.backend-response.error">Request failed.</Trans>
          </p>
          {greetQuery.error instanceof AppInvokeError ? (
            <div>
              <p>{greetQuery.error.type}</p>
              <p>{greetQuery.error.message}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {greetQuery.data ? (
        <div className="border-border/70 bg-card rounded-md border p-4">
          <p>{greetQuery.data}</p>
        </div>
      ) : null}
    </section>
  );
}
