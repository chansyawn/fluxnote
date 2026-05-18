import type { PersistedBlockEditorHandle } from "@renderer/features/block";
import { useCallback, useRef } from "react";

export interface EditorRegistry {
  registerEditor: (blockId: string, handle: PersistedBlockEditorHandle | null) => void;
  getEditor: (blockId: string) => PersistedBlockEditorHandle | undefined;
  requestEditorFocus: (blockId: string | null, requestId?: number) => boolean;
}

interface PendingFocusRequest {
  blockId: string;
  requestId: number;
}

export function useEditorRegistry(): EditorRegistry {
  const editorsRef = useRef(new Map<string, PersistedBlockEditorHandle>());
  const focusTargetRef = useRef<PendingFocusRequest | null>(null);
  const fallbackRequestIdRef = useRef(0);

  const tryFocus = useCallback((request: PendingFocusRequest) => {
    const editor = editorsRef.current.get(request.blockId);
    if (!editor) return false;
    if (focusTargetRef.current?.requestId !== request.requestId) return false;
    focusTargetRef.current = null;
    editor.focus();
    return true;
  }, []);

  const registerEditor = useCallback(
    (blockId: string, handle: PersistedBlockEditorHandle | null) => {
      if (handle) {
        editorsRef.current.set(blockId, handle);
        const pendingFocus = focusTargetRef.current;
        if (pendingFocus?.blockId === blockId) {
          queueMicrotask(() => {
            tryFocus(pendingFocus);
          });
        }
        return;
      }

      editorsRef.current.delete(blockId);
    },
    [tryFocus],
  );

  const getEditor = useCallback((blockId: string) => {
    return editorsRef.current.get(blockId);
  }, []);

  const requestEditorFocus = useCallback(
    (blockId: string | null, requestId?: number) => {
      if (!blockId) {
        focusTargetRef.current = null;
        return false;
      }

      const request = {
        blockId,
        requestId: requestId ?? (fallbackRequestIdRef.current += 1),
      };
      focusTargetRef.current = request;
      return tryFocus(request);
    },
    [tryFocus],
  );

  return { registerEditor, getEditor, requestEditorFocus };
}
