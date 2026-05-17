import { ErrorTitleBar } from "@renderer/features/error-boundary/error-title-bar";
import { GlobalErrorContent } from "@renderer/features/error-boundary/global-error-content";
import type { FallbackProps } from "react-error-boundary";

export function AppErrorFallback({ error }: FallbackProps) {
  return (
    <div className="app-window-shell mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl">
      <ErrorTitleBar />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-3">
          <GlobalErrorContent error={error} onRetry={() => window.location.reload()} />
        </section>
      </main>
    </div>
  );
}
