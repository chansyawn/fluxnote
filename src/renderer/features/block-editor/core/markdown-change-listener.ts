import type { EditorState, LexicalEditor } from "lexical";

import { exportEditorStateToMarkdown } from "./markdown-editor-io";

const MARKDOWN_CHANGE_DEBOUNCE_MS = 600;

export interface MarkdownChangeListenerOptions {
  onMarkdownChange: (markdown: string) => void;
}

export interface MarkdownChangeHandle {
  flush: () => string;
}

export interface MarkdownChangeListener extends MarkdownChangeHandle {
  dispose: () => void;
}

export function registerMarkdownChangeListener(
  editor: LexicalEditor,
  options: MarkdownChangeListenerOptions,
): MarkdownChangeListener {
  let latestMarkdown = exportEditorStateToMarkdown(editor.getEditorState());
  let pendingEditorState: EditorState | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  const clearPendingTimer = (): void => {
    if (pendingTimer === null) {
      return;
    }

    clearTimeout(pendingTimer);
    pendingTimer = null;
  };

  const emitMarkdown = (editorState: EditorState): string => {
    pendingEditorState = null;
    const markdown = exportEditorStateToMarkdown(editorState);
    if (markdown === latestMarkdown) {
      return latestMarkdown;
    }

    latestMarkdown = markdown;
    options.onMarkdownChange(markdown);
    return latestMarkdown;
  };

  const flush = (): string => {
    clearPendingTimer();
    return pendingEditorState ? emitMarkdown(pendingEditorState) : latestMarkdown;
  };

  const schedule = (editorState: EditorState): void => {
    pendingEditorState = editorState;
    clearPendingTimer();
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (pendingEditorState) {
        emitMarkdown(pendingEditorState);
      }
    }, MARKDOWN_CHANGE_DEBOUNCE_MS);
  };

  const unregister = editor.registerUpdateListener(
    ({ dirtyElements, dirtyLeaves, editorState }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }

      schedule(editorState);
    },
  );

  return {
    dispose: () => {
      flush();
      unregister();
    },
    flush,
  };
}
