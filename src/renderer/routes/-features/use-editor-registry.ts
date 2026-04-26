import type { NoteBlockEditorHandle } from "@renderer/features/note-block/note-block-editor";
import { useCallback, useRef } from "react";

export interface EditorRegistry {
  registerEditor: (blockId: string, handle: NoteBlockEditorHandle | null) => void;
  getEditor: (blockId: string) => NoteBlockEditorHandle | undefined;
  requestEditorFocus: (blockId: string | null) => void;
}

export function useEditorRegistry(): EditorRegistry {
  const editorsRef = useRef(new Map<string, NoteBlockEditorHandle>());
  const focusTargetRef = useRef<string | null>(null);

  const tryFocus = useCallback((blockId: string) => {
    const editor = editorsRef.current.get(blockId);
    if (!editor) return false;
    focusTargetRef.current = null;
    setTimeout(() => editor.focus(), 0);
    return true;
  }, []);

  const registerEditor = useCallback(
    (blockId: string, handle: NoteBlockEditorHandle | null) => {
      if (handle) {
        editorsRef.current.set(blockId, handle);
        if (focusTargetRef.current === blockId) {
          tryFocus(blockId);
        }
      } else {
        editorsRef.current.delete(blockId);
      }
    },
    [tryFocus],
  );

  const getEditor = useCallback((blockId: string) => {
    return editorsRef.current.get(blockId);
  }, []);

  const requestEditorFocus = useCallback(
    (blockId: string | null) => {
      focusTargetRef.current = blockId;
      if (blockId) {
        tryFocus(blockId);
      }
    },
    [tryFocus],
  );

  return { registerEditor, getEditor, requestEditorFocus };
}
