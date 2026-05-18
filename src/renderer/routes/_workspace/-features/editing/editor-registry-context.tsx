import type { PersistedBlockEditorHandle } from "@renderer/features/block";
import { createContext, useContext, type ReactNode } from "react";

export interface EditorRegistryContextValue {
  registerEditor: (blockId: string, handle: PersistedBlockEditorHandle | null) => void;
  getEditor: (blockId: string) => PersistedBlockEditorHandle | undefined;
}

const EditorRegistryContext = createContext<EditorRegistryContextValue | null>(null);

export function EditorRegistryProvider({
  value,
  children,
}: {
  value: EditorRegistryContextValue;
  children: ReactNode;
}) {
  return <EditorRegistryContext.Provider value={value}>{children}</EditorRegistryContext.Provider>;
}

export function useEditorRegistryContext(): EditorRegistryContextValue {
  const context = useContext(EditorRegistryContext);
  if (!context) {
    throw new Error("useEditorRegistryContext must be used within EditorRegistryProvider");
  }
  return context;
}
