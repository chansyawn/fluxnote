import type { EditorState, LexicalEditor } from "lexical";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown/processor";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  mdastToSemanticDocument,
  semanticDocumentToMdast,
} from "../model";

/**
 * Markdown IO intentionally round-trips through mdast and the semantic document
 * model so editing state and Markdown text stay semantically consistent while
 * the serializer is free to normalize source formatting.
 */
export function importMarkdownToEditor(editor: LexicalEditor, markdown: string): void {
  importSemanticDocumentToLexical(mdastToSemanticDocument(parseMarkdownToMdast(markdown)), editor);
}

export function exportEditorStateToMarkdown(editorState: EditorState): string {
  return stringifyMdastToMarkdown(
    semanticDocumentToMdast(exportLexicalToSemanticDocument(editorState)),
  );
}
