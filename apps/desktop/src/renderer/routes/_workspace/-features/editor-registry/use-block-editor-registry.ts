import { useCallback, useRef, useState } from "react";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";

export interface BlockEditorRegistry {
  activeBlockId: string | null;
  activeEditor: WorkspaceBlockEditorHandle | undefined;
  registerEditor: (blockId: string, handle: WorkspaceBlockEditorHandle | null) => void;
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  requestEditorFocus: (blockId: string | null, requestId?: number) => boolean;
  setActiveBlockId: (blockId: string | null) => void;
}

interface PendingFocusRequest {
  blockId: string;
  requestId: number;
}

export function useBlockEditorRegistry(): BlockEditorRegistry {
  const editorsRef = useRef(new Map<string, WorkspaceBlockEditorHandle>());
  const focusTargetRef = useRef<PendingFocusRequest | null>(null);
  const fallbackRequestIdRef = useRef(0);
  const activeBlockIdRef = useRef<string | null>(null);
  const [activeBlockId, setActiveBlockIdState] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<WorkspaceBlockEditorHandle | undefined>();

  const setActiveBlockId = useCallback((blockId: string | null) => {
    activeBlockIdRef.current = blockId;
    setActiveBlockIdState(blockId);

    if (!blockId) {
      focusTargetRef.current = null;
      setActiveEditor(undefined);
      return;
    }

    setActiveEditor(editorsRef.current.get(blockId));
  }, []);

  const tryFocus = useCallback((request: PendingFocusRequest) => {
    const editor = editorsRef.current.get(request.blockId);
    if (!editor) return false;
    if (focusTargetRef.current?.requestId !== request.requestId) return false;
    focusTargetRef.current = null;
    editor.focus();
    return true;
  }, []);

  const registerEditor = useCallback(
    (blockId: string, handle: WorkspaceBlockEditorHandle | null) => {
      if (handle) {
        editorsRef.current.set(blockId, handle);
        if (activeBlockIdRef.current === blockId) {
          setActiveEditor(handle);
        }
        const pendingFocus = focusTargetRef.current;
        if (pendingFocus?.blockId === blockId) {
          queueMicrotask(() => {
            tryFocus(pendingFocus);
          });
        }
        return;
      }

      editorsRef.current.delete(blockId);
      if (activeBlockIdRef.current === blockId) {
        setActiveEditor(undefined);
      }
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

  return {
    activeBlockId,
    activeEditor,
    registerEditor,
    getEditor,
    requestEditorFocus,
    setActiveBlockId,
  };
}
