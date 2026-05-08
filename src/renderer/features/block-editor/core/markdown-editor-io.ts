import type { EditorState, LexicalEditor } from "lexical";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown/processor";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  mdastToSemanticDocument,
  semanticDocumentToMdast,
} from "../model";

export function importMarkdownToEditor(editor: LexicalEditor, markdown: string): void {
  importSemanticDocumentToLexical(mdastToSemanticDocument(parseMarkdownToMdast(markdown)), editor);
}

export function exportEditorStateToMarkdown(editorState: EditorState): string {
  return stringifyMdastToMarkdown(
    semanticDocumentToMdast(exportLexicalToSemanticDocument(editorState)),
  );
}
