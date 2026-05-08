import { $convertFromMarkdownString } from "@lexical/markdown";
import type { LexicalEditor, SerializedEditorState } from "lexical";

import {
  createMarkdownEditor,
  exportEditorStateToMarkdown,
  importMarkdownToEditor,
} from "../editor-state";
import { parseMarkdownToMdast } from "../markdown/processor";
import {
  exportLexicalToSemanticDocument,
  mdastToSemanticDocument,
  type SemanticDocument,
} from "../model";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../syntax/markdown-shortcuts";

export interface MarkdownSyntaxSnapshot {
  lexical: SerializedEditorState;
  markdown: string;
  semantic: SemanticDocument;
}

export function createHeadlessMarkdownEditor(namespace = "BlockEditorHeadlessTest"): LexicalEditor {
  return createMarkdownEditor(namespace);
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

export function parseMarkdownWithShortcuts(markdown: string): SemanticDocument {
  const editor = createHeadlessMarkdownEditor();
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, MARKDOWN_SHORTCUT_TRANSFORMERS);
    },
    { discrete: true },
  );
  return exportLexicalToSemanticDocument(editor.getEditorState());
}
