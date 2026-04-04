import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { AppInvokeError } from "@/app/invoke";
import { greet } from "@/clients";
import { Button } from "@/ui/components/button";

type QueryName = string | null;

function formatDetails(details: unknown): string {
  if (details === undefined || details === null) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return JSON.stringify({ fallback: "Unserializable details" }, null, 2);
  }
}

export function SampleGreetPanel() {
  const [nameInput, setNameInput] = useState("FluxNote");
  const [queryName, setQueryName] = useState<QueryName>("FluxNote");

  const greetQuery = useQuery({
    queryKey: ["sample", "greet", queryName],
    enabled: queryName !== null,
    queryFn: async () => greet({ name: queryName ?? "" }),
  });

  const detailsText =
    greetQuery.error instanceof AppInvokeError ? formatDetails(greetQuery.error.details) : "";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (queryName === nameInput) {
      void greetQuery.refetch();
      return;
    }

    setQueryName(nameInput);
  };

  return (
    <section className="border-border/70 bg-card rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">
          <Trans id="sample.greet.title">Query + Client + Invoke Demo</Trans>
        </h2>
        <p className="text-muted-foreground text-xs">
          <Trans id="sample.greet.description">
            Try normal names, empty value, long value, or `missing` to see different error types.
          </Trans>
        </p>
      </div>

      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">
            <Trans id="sample.greet.input.label">Name</Trans>
          </span>
          <input
            className="border-border bg-background focus-visible:ring-ring/30 h-8 rounded-md border px-2 text-xs outline-none focus-visible:ring-2"
            value={nameInput}
            onChange={(event) => {
              setNameInput(event.target.value);
            }}
            placeholder="FluxNote"
          />
        </label>

        <div className="flex items-center gap-2">
          <Button type="submit">
            <Trans id="sample.greet.submit">Run greet query</Trans>
          </Button>
          <p className="text-muted-foreground text-xs">
            <Trans id="sample.greet.tip">Tip: try `missing` or an empty value.</Trans>
          </p>
        </div>
      </form>

      <div className="mt-4">
        {greetQuery.isPending ? (
          <p className="text-muted-foreground text-xs">
            <Trans id="sample.greet.loading">Loading response from Rust backend...</Trans>
          </p>
        ) : null}

        {greetQuery.data ? (
          <div className="bg-background rounded-md border p-3 text-xs">
            <p className="font-medium">
              <Trans id="sample.greet.success.title">Success</Trans>
            </p>
            <p className="mt-1">{greetQuery.data}</p>
          </div>
        ) : null}

        {greetQuery.isError ? (
          <div className="rounded-md border border-red-400/70 bg-red-50 p-3 text-xs text-red-800">
            <p className="font-medium">
              <Trans id="sample.greet.error.title">Structured error</Trans>
            </p>
            {greetQuery.error instanceof AppInvokeError ? (
              <div className="mt-1 space-y-1">
                <p>
                  <span className="font-medium">
                    <Trans id="sample.greet.error.type">Type:</Trans>
                  </span>{" "}
                  {greetQuery.error.type}
                </p>
                <p>
                  <span className="font-medium">
                    <Trans id="sample.greet.error.message">Message:</Trans>
                  </span>{" "}
                  {greetQuery.error.message}
                </p>
                {detailsText ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer font-medium">
                      <Trans id="sample.greet.error.details">Details</Trans>
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-red-100/60 p-2 text-[11px]">
                      {detailsText}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : (
              <p className="mt-1">
                <Trans id="sample.greet.error.unknown">Unknown error shape.</Trans>
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
