import { getExtensionDependencyFromEditor, LexicalBuilder } from "@lexical/extension";
import { $convertFromMarkdownString } from "@lexical/markdown";
import type { LexicalEditor } from "lexical";
import type { Root } from "mdast";

import { createBlockEditorCoreExtension } from "../core/block-editor-core-extension";
import { exportLexicalToMdast, importMdastToLexical } from "../core/lexical-mdast";
import { exportEditorStateToMarkdown, importMarkdownToEditor } from "../core/markdown-editor-io";
import { MarkdownShortcutExtension } from "../markdown/markdown-shortcut-extension";

export function createHeadlessEditor(): LexicalEditor {
  return LexicalBuilder.fromExtensions([createBlockEditorCoreExtension()]).buildEditor();
}

export function editorFromMarkdown(markdown: string): LexicalEditor {
  const editor = createHeadlessEditor();
  importMarkdownToEditor(editor, markdown);
  return editor;
}

export function editorFromMdast(mdast: Root): LexicalEditor {
  const editor = createHeadlessEditor();
  importMdastToLexical(mdast, editor);
  return editor;
}

export function readMarkdown(editor: LexicalEditor): string {
  return exportEditorStateToMarkdown(editor.getEditorState());
}

export function readMdast(editor: LexicalEditor): Root {
  return exportLexicalToMdast(editor.getEditorState());
}

/**
 * Drive markdown through Lexical's shortcut transformer pipeline (the same
 * code path that runs when a user types `# ` or `- [ ]` in the live editor).
 * Returns the resulting mdast so tests can assert structure.
 */
export function applyMarkdownShortcuts(markdown: string): Root {
  const editor = createHeadlessEditor();
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
  return readMdast(editor);
}
