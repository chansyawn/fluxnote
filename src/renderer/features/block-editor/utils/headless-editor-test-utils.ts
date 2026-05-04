import { createHeadlessEditor } from "@lexical/headless";
import type { LexicalEditor, SerializedEditorState } from "lexical";
import type { Root } from "mdast";

import { importMarkdownToEditor } from "../core/editor-state";
import { exportLexicalToMdast } from "../core/export-lexical-to-mdast";
import { stringifyMdastToMarkdown } from "../core/markdown-processor";
import { lexicalNodes } from "../core/syntax-registry";

export interface MarkdownSyntaxSnapshot {
  lexical: SerializedEditorState;
  mdast: Root;
  markdown: string;
}

export function createHeadlessMarkdownEditor(namespace = "BlockEditorHeadlessTest"): LexicalEditor {
  return createHeadlessEditor({
    namespace,
    nodes: [...lexicalNodes],
    onError(error) {
      throw error;
    },
  });
}

export function createMarkdownSyntaxSnapshot(markdown: string): MarkdownSyntaxSnapshot {
  const editor = createHeadlessMarkdownEditor();
  importMarkdownToEditor(editor, markdown);
  const editorState = editor.getEditorState();
  const mdast = exportLexicalToMdast(editorState);

  return {
    lexical: editorState.toJSON(),
    markdown: stringifyMdastToMarkdown(mdast),
    mdast,
  };
}
