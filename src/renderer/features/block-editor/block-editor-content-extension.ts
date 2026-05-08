import { defineExtension, type InitialEditorStateType } from "lexical";

import { importMarkdownToEditor } from "./editor-state";
import { SYNTAX_EXTENSIONS } from "./syntax/registry";

export function createInitialMarkdownEditorState(markdown: string): InitialEditorStateType {
  return (editor) => {
    importMarkdownToEditor(editor, markdown);
  };
}

export function createBlockEditorContentExtension(initialMarkdown: string) {
  return defineExtension({
    name: "fluxnotes/block-editor/content",
    namespace: "BlockEditor",
    $initialEditorState: createInitialMarkdownEditorState(initialMarkdown),
    dependencies: [...SYNTAX_EXTENSIONS],
    onError(error) {
      throw error;
    },
  });
}
