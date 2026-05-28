import type { LexicalEditor } from "lexical";

interface WritableBooleanSignal {
  value: boolean;
}

type RootListenerEditor = Pick<LexicalEditor, "registerRootListener">;

export function refreshTableSelectionObserverRegistration(
  editor: RootListenerEditor,
  hasTabHandler: WritableBooleanSignal,
): () => void {
  let active = true;
  const unregisterRootListener = editor.registerRootListener((rootElement) => {
    if (rootElement === null) {
      return;
    }

    // Workaround for a Lexical 0.44 TableExtension selection observer registration bug.
    queueMicrotask(() => {
      if (!active) {
        return;
      }

      hasTabHandler.value = !hasTabHandler.value;
      hasTabHandler.value = !hasTabHandler.value;
    });
  });

  return () => {
    active = false;
    unregisterRootListener();
  };
}
