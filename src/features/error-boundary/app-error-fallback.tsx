import type { FallbackProps } from "react-error-boundary";

import { ErrorTitleBar } from "@/features/error-boundary/error-title-bar";
import { GlobalErrorContent } from "@/features/error-boundary/global-error-content";

export function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="mx-auto flex flex-col overflow-hidden rounded-xl">
      <ErrorTitleBar />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-3">
          <GlobalErrorContent error={error} onRetry={resetErrorBoundary} />
        </section>
      </main>
    </div>
  );
}
