import { BlockErrorFallback } from "@renderer/features/error-boundary/block-error-fallback";
import { captureRendererError } from "@renderer/features/telemetry";
import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface BlockErrorBoundaryProps {
  blockId: string;
  onDeleteBlock: (blockId: string) => Promise<void> | void;
  children: ReactNode;
}

export function BlockErrorBoundary({ blockId, onDeleteBlock, children }: BlockErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={(fallbackProps) => (
        <BlockErrorFallback {...fallbackProps} blockId={blockId} onDeleteBlock={onDeleteBlock} />
      )}
      onError={(error, info) => {
        captureRendererError(error, {
          componentStack: info.componentStack,
          pathname: window.location.pathname,
          source: "react.block-error-boundary",
        });
        console.error(`Block render error [${blockId}]`, error, info.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
