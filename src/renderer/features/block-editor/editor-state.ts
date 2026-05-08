import { LexicalBuilder } from "@lexical/extension";
import type { EditorState, LexicalEditor } from "lexical";

import { createBlockEditorHeadlessExtension } from "./block-editor-content-extension";
import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "./markdown/processor";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  mdastToSemanticDocument,
  semanticDocumentToMdast,
} from "./model";

export function createMarkdownEditor(namespace = "BlockEditorTest"): LexicalEditor {
  const editor = LexicalBuilder.fromExtensions([
    createBlockEditorHeadlessExtension(namespace),
  ]).buildEditor();

  return editor;
}

export function importMarkdownToEditor(editor: LexicalEditor, markdown: string): void {
  importSemanticDocumentToLexical(mdastToSemanticDocument(parseMarkdownToMdast(markdown)), editor);
}

export function exportEditorStateToMarkdown(editorState: EditorState): string {
  return stringifyMdastToMarkdown(
    semanticDocumentToMdast(exportLexicalToSemanticDocument(editorState)),
  );
}

export function roundTripMarkdown(markdown: string): string {
  const editor = createMarkdownEditor();
  importMarkdownToEditor(editor, markdown);
  return exportEditorStateToMarkdown(editor.getEditorState());
}
