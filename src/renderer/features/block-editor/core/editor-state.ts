import { createEditor, type EditorState, type LexicalEditor } from "lexical";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "./markdown-processor";
import { blockEditorNodes } from "./runtime";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
} from "./semantic/lexical-adapter";
import { mdastToSemanticDocument, semanticDocumentToMdast } from "./semantic/mdast-adapter";

export function createMarkdownEditor(namespace = "BlockEditorTest"): LexicalEditor {
  return createEditor({
    namespace,
    nodes: [...blockEditorNodes],
    onError(error) {
      throw error;
    },
  });
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
