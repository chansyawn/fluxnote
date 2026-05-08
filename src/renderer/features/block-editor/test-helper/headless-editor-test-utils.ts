import { getExtensionDependencyFromEditor } from "@lexical/extension";
import { $convertFromMarkdownString } from "@lexical/markdown";
import type { LexicalEditor, SerializedEditorState } from "lexical";

import { createHeadlessMarkdownEditor as createCoreHeadlessMarkdownEditor } from "../core/headless-markdown-editor";
import { MarkdownShortcutExtension } from "../markdown/markdown-shortcut-extension";
import { parseMarkdownToMdast } from "../markdown/processor";
import {
  exportLexicalToSemanticDocument,
  mdastToSemanticDocument,
  type SemanticDocument,
} from "../model";

export interface MarkdownSyntaxSnapshot {
  lexical: SerializedEditorState;
  markdown: string;
  semantic: SemanticDocument;
}

export function createHeadlessMarkdownEditor(namespace = "BlockEditorHeadlessTest"): LexicalEditor {
  return createCoreHeadlessMarkdownEditor(namespace);
}

export function markdownToSemantic(markdown: string): SemanticDocument {
  return mdastToSemanticDocument(parseMarkdownToMdast(markdown));
}

export function parseMarkdownWithShortcuts(markdown: string): SemanticDocument {
  const editor = createHeadlessMarkdownEditor();
  const { transformers } = getExtensionDependencyFromEditor(
    editor,
    MarkdownShortcutExtension,
  ).config;

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, [...transformers]);
    },
    { discrete: true },
  );
  return exportLexicalToSemanticDocument(editor.getEditorState());
}
