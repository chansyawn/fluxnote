import { ErrorTitleBar } from "@renderer/features/error-boundary/error-title-bar";
import { GlobalErrorContent } from "@renderer/features/error-boundary/global-error-content";
import { captureRendererError } from "@renderer/features/telemetry";
import { WindowShell } from "@renderer/routes/-layout/window-shell";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";
import type { FallbackProps } from "react-error-boundary";

type GlobalErrorFallbackVariant = "shell" | "content";

interface GlobalErrorFallbackProps {
  error: unknown;
  variant: GlobalErrorFallbackVariant;
}

function GlobalErrorPanel({ error, variant }: GlobalErrorFallbackProps) {
  return (
    <section
      className={
        variant === "shell"
          ? "mx-auto flex w-full px-6 py-3"
          : "mx-auto flex w-full px-3 py-3 sm:px-6"
      }
    >
      <GlobalErrorContent error={error} />
    </section>
  );
}

function GlobalErrorFallback({ error, variant }: GlobalErrorFallbackProps) {
  if (variant === "shell") {
    return (
      <WindowShell>
        <ErrorTitleBar />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <GlobalErrorPanel error={error} variant={variant} />
        </main>
      </WindowShell>
    );
  }

  return <GlobalErrorPanel error={error} variant={variant} />;
}

export function AppErrorFallback({ error }: FallbackProps) {
  return <GlobalErrorFallback error={error} variant="shell" />;
}

export function RootRouterErrorFallback({ error }: ErrorComponentProps) {
  return <GlobalErrorFallback error={error} variant="shell" />;
}

export function RouterErrorFallback({ error }: ErrorComponentProps) {
  useEffect(() => {
    captureRendererError(error, {
      pathname: window.location.pathname,
      source: "router.error-fallback",
    });
  }, [error]);

  return <GlobalErrorFallback error={error} variant="content" />;
}
