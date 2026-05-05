import { createHeadlessEditor } from "@lexical/headless";
import type { LexicalEditor, SerializedEditorState } from "lexical";

import { exportEditorStateToMarkdown, importMarkdownToEditor } from "../core/editor-state";
import { blockEditorNodes } from "../core/runtime";
import { exportLexicalToSemanticDocument } from "../core/semantic/lexical-adapter";
import { mdastToSemanticDocument } from "../core/semantic/mdast-adapter";
import { parseMarkdownToMdast } from "../markdown/processor";
import type { SemanticDocument } from "../model";

export interface MarkdownSyntaxSnapshot {
  lexical: SerializedEditorState;
  markdown: string;
  semantic: SemanticDocument;
}

export function createHeadlessMarkdownEditor(namespace = "BlockEditorHeadlessTest"): LexicalEditor {
  return createHeadlessEditor({
    namespace,
    nodes: [...blockEditorNodes],
    onError(error) {
      throw error;
    },
  });
}

export function createMarkdownSyntaxSnapshot(markdown: string): MarkdownSyntaxSnapshot {
  const editor = createHeadlessMarkdownEditor();
  importMarkdownToEditor(editor, markdown);
  const editorState = editor.getEditorState();

  return {
    lexical: editorState.toJSON(),
    markdown: exportEditorStateToMarkdown(editorState),
    semantic: exportLexicalToSemanticDocument(editorState),
  };
}

export function markdownToSemantic(markdown: string): SemanticDocument {
  return mdastToSemanticDocument(parseMarkdownToMdast(markdown));
}
