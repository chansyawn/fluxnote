import type { EditorState, LexicalEditor } from "lexical";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown/processor";
import { exportLexicalToMdast, importMdastToLexical } from "./lexical-mdast";

export function importMarkdownToEditor(editor: LexicalEditor, markdown: string): void {
  importMdastToLexical(parseMarkdownToMdast(markdown), editor);
}

export function exportEditorStateToMarkdown(editorState: EditorState): string {
  return stringifyMdastToMarkdown(exportLexicalToMdast(editorState));
}
