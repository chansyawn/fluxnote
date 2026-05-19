import { createContext, useContext, type ReactNode } from "react";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";

export interface BlockEditorRegistryContextValue {
  registerEditor: (blockId: string, handle: WorkspaceBlockEditorHandle | null) => void;
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
}

const BlockEditorRegistryContext = createContext<BlockEditorRegistryContextValue | null>(null);

export function BlockEditorRegistryProvider({
  value,
  children,
}: {
  value: BlockEditorRegistryContextValue;
  children: ReactNode;
}) {
  return (
    <BlockEditorRegistryContext.Provider value={value}>
      {children}
    </BlockEditorRegistryContext.Provider>
  );
}

export function useBlockEditorRegistryContext(): BlockEditorRegistryContextValue {
  const context = useContext(BlockEditorRegistryContext);
  if (!context) {
    throw new Error(
      "useBlockEditorRegistryContext must be used within BlockEditorRegistryProvider",
    );
  }
  return context;
}
