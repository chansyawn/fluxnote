import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState, LexicalEditor } from "lexical";
import { useLayoutEffect, useRef } from "react";

import { exportEditorStateToMarkdown } from "./editor-state";

export interface MarkdownChangePluginProps {
  onMarkdownUpdated: (markdown: string) => void;
}

export interface MarkdownChangeListenerOptions extends MarkdownChangePluginProps {}

function exportMarkdownFromState(editorState: EditorState): string {
  return exportEditorStateToMarkdown(editorState);
}

export function registerMarkdownChangeListener(
  editor: LexicalEditor,
  options: MarkdownChangeListenerOptions,
): () => void {
  let latestMarkdown = exportMarkdownFromState(editor.getEditorState());

  return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, editorState }) => {
    if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
      return;
    }

    const markdown = exportMarkdownFromState(editorState);
    if (markdown === latestMarkdown) {
      return;
    }

    latestMarkdown = markdown;
    options.onMarkdownUpdated(markdown);
  });
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
