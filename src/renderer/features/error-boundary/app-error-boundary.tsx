import { AppErrorFallback } from "@renderer/features/error-boundary/app-error-fallback";
import { captureRendererError } from "@renderer/features/telemetry";
import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, info) => {
        captureRendererError(error, {
          componentStack: info.componentStack,
          pathname: window.location.pathname,
          source: "react.app-error-boundary",
        });
        console.error("Unhandled app error", error, info.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
