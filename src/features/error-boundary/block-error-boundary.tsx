import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { BlockErrorFallback } from "@/features/error-boundary/block-error-fallback";

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
        console.error(`Block render error [${blockId}]`, error, info.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
