import type { LexicalEditor } from "lexical";

import { exportEditorStateToMarkdown } from "./markdown-editor-io";

const DEBOUNCE_MS = 600;

export interface MarkdownChangeHandle {
  flush: () => string;
}

export interface MarkdownChangeListener extends MarkdownChangeHandle {
  dispose: () => void;
}

export function registerMarkdownChangeListener(
  editor: LexicalEditor,
  onMarkdownChange: (markdown: string) => void,
): MarkdownChangeListener {
  let lastEmitted = exportEditorStateToMarkdown(editor.getEditorState());
  let timer: ReturnType<typeof setTimeout> | null = null;

  const emit = (): string => {
    const markdown = exportEditorStateToMarkdown(editor.getEditorState());
    if (markdown !== lastEmitted) {
      lastEmitted = markdown;
      onMarkdownChange(markdown);
    }
    return lastEmitted;
  };

  const flush = (): string => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      return emit();
    }
    return lastEmitted;
  };

  const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
    if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      emit();
    }, DEBOUNCE_MS);
  });

  return {
    dispose: () => {
      flush();
      unregister();
    },
    flush,
  };
}
