import { createContext, useContext, type ReactNode } from "react";

import type { BlockEditorRuntime } from "./types";

const BlockEditorRuntimeContext = createContext<BlockEditorRuntime | null>(null);

export function BlockEditorRuntimeProvider({
  children,
  runtime,
}: {
  children: ReactNode;
  runtime: BlockEditorRuntime;
}) {
  return (
    <BlockEditorRuntimeContext.Provider value={runtime}>
      {children}
    </BlockEditorRuntimeContext.Provider>
  );
}

export function useBlockEditorRuntime(): BlockEditorRuntime {
  const runtime = useContext(BlockEditorRuntimeContext);
  if (runtime === null) {
    throw new Error("BlockEditorRuntimeProvider is missing.");
  }

  return runtime;
}
