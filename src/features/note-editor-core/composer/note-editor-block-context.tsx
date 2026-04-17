import { createContext, useContext } from "react";

export const NoteEditorBlockContext = createContext<string | undefined>(undefined);

export function useNoteEditorBlockId(): string {
  const blockId = useContext(NoteEditorBlockContext);

  if (blockId === undefined) {
    throw new Error("useNoteEditorBlockId must be used within NoteEditorBlockContext.Provider");
  }

  return blockId;
}
