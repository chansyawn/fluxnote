import { createContext, useContext } from "react";

export const BlockEditorContext = createContext<string | undefined>(undefined);

export function useBlockEditorBlockId(): string {
  const blockId = useContext(BlockEditorContext);

  if (blockId === undefined) {
    throw new Error("useBlockEditorBlockId must be used within BlockEditorContext.Provider");
  }

  return blockId;
}
