import { AppErrorFallback } from "@renderer/features/error-boundary/app-error-fallback";
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
        console.error("Unhandled app error", error, info.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
