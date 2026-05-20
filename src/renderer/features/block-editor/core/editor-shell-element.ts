import type { LexicalEditor } from "lexical";
import { useCallback, useSyncExternalStore } from "react";

export function getEditorShellElement(editorRootElement: HTMLElement | null): HTMLElement | null {
  return editorRootElement?.closest<HTMLElement>(".block-editor__shell") ?? null;
}

export function useEditorShellElement(editor: LexicalEditor): HTMLElement | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerRootListener(() => {
        onStoreChange();
      });
    },
    [editor],
  );

  const getSnapshot = useCallback(() => {
    return getEditorShellElement(editor.getRootElement());
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
