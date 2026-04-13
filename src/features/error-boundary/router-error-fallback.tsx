import type { ErrorComponentProps } from "@tanstack/react-router";

import { GlobalErrorContent } from "@/features/error-boundary/global-error-content";

export function RouterErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <section className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-3">
        <GlobalErrorContent error={error} onRetry={reset} />
      </section>
    </main>
  );
}
