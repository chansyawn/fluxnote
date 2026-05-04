import { createEditor, type EditorState, type LexicalEditor } from "lexical";

import { exportLexicalToMdast } from "./export-lexical-to-mdast";
import { importMdastToLexical } from "./import-mdast-to-lexical";
import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "./markdown-processor";
import { lexicalNodes } from "./syntax-registry";

export function createMarkdownEditor(namespace = "BlockEditorTest"): LexicalEditor {
  return createEditor({
    namespace,
    nodes: [...lexicalNodes],
    onError(error) {
      throw error;
    },
  });
}

export function importMarkdownToEditor(editor: LexicalEditor, markdown: string): void {
  importMdastToLexical(parseMarkdownToMdast(markdown), editor, markdown);
}

export function exportEditorStateToMarkdown(editorState: EditorState): string {
  return stringifyMdastToMarkdown(exportLexicalToMdast(editorState));
}

export function roundTripMarkdown(markdown: string): string {
  const editor = createMarkdownEditor();
  importMarkdownToEditor(editor, markdown);
  return exportEditorStateToMarkdown(editor.getEditorState());
}
