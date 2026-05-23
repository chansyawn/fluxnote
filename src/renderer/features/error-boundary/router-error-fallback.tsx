import { GlobalErrorContent } from "@renderer/features/error-boundary/global-error-content";
import { captureRendererError } from "@renderer/features/telemetry";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

export function RouterErrorFallback({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    captureRendererError(error, {
      pathname: window.location.pathname,
      source: "router.error-fallback",
    });
  }, [error]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <section className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-3">
        <GlobalErrorContent error={error} onRetry={reset} />
      </section>
    </main>
  );
}
