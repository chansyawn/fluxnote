import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalEditor } from "lexical";
import { useLayoutEffect, useRef } from "react";

import { exportEditorStateToMarkdown } from "./markdown-editor-io";

export interface MarkdownChangeListenerOptions {
  onMarkdownUpdated: (markdown: string) => void;
}

export function registerMarkdownChangeListener(
  editor: LexicalEditor,
  options: MarkdownChangeListenerOptions,
): () => void {
  let latestMarkdown = exportEditorStateToMarkdown(editor.getEditorState());

  return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, editorState }) => {
    if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
      return;
    }

    const markdown = exportEditorStateToMarkdown(editorState);
    if (markdown === latestMarkdown) {
      return;
    }

    latestMarkdown = markdown;
    options.onMarkdownUpdated(markdown);
  });
}

export interface MarkdownChangePluginProps {
  onMarkdownUpdated: (markdown: string) => void;
}

export function MarkdownChangePlugin({ onMarkdownUpdated }: MarkdownChangePluginProps): null {
  const [editor] = useLexicalComposerContext();
  const onMarkdownUpdatedRef = useRef(onMarkdownUpdated);

  useLayoutEffect(() => {
    onMarkdownUpdatedRef.current = onMarkdownUpdated;
  }, [onMarkdownUpdated]);

  useLayoutEffect(
    () =>
      registerMarkdownChangeListener(editor, {
        onMarkdownUpdated: (markdown) => onMarkdownUpdatedRef.current(markdown),
      }),
    [editor],
  );

  return null;
}
