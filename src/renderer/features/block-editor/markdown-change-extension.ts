import { defineExtension, type EditorState } from "lexical";

import { exportEditorStateToMarkdown } from "./editor-state";

export interface MarkdownChangeExtensionConfig {
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
}

function exportMarkdownFromState(editorState: EditorState): string {
  return exportEditorStateToMarkdown(editorState);
}

export const MarkdownChangeExtension = defineExtension({
  name: "fluxnotes/block-editor/markdown-change",
  config: {
    initialMarkdown: "",
    onMarkdownUpdated: (_markdown: string) => {},
  } satisfies MarkdownChangeExtensionConfig,
  register(editor, config) {
    let latestMarkdown = config.initialMarkdown;

    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, editorState }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }

      const markdown = exportMarkdownFromState(editorState);
      if (markdown === latestMarkdown) {
        return;
      }

      latestMarkdown = markdown;
      config.onMarkdownUpdated(markdown);
    });
  },
});
