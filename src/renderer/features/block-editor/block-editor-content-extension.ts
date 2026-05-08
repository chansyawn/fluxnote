import { ReactExtension } from "@lexical/react/ReactExtension";
import { configExtension, defineExtension, type InitialEditorStateType } from "lexical";

import { createBlockEditorCoreExtension } from "./block-editor-core-extension";
import { ClipboardExtension } from "./clipboard/clipboard-extension";
import { importMarkdownToEditor } from "./editor-state";
import { CODE_SYNTAX_REACT_EXTENSION } from "./syntax/code";
import { IMAGE_SYNTAX_EXTENSION } from "./syntax/image";

export interface BlockEditorContentExtensionConfig {
  blockId: string;
  initialMarkdown: string;
  namespace?: string;
}

export function createInitialMarkdownEditorState(markdown: string): InitialEditorStateType {
  return (editor) => {
    importMarkdownToEditor(editor, markdown);
  };
}

export function createBlockEditorContentExtension(config: BlockEditorContentExtensionConfig) {
  return defineExtension({
    name: "fluxnotes/block-editor/content",
    namespace: config.namespace ?? "BlockEditor",
    $initialEditorState: createInitialMarkdownEditorState(config.initialMarkdown),
    dependencies: [
      configExtension(ReactExtension, {
        contentEditable: null,
      }),
      CODE_SYNTAX_REACT_EXTENSION,
      createBlockEditorCoreExtension(config.namespace ?? "BlockEditor"),
      configExtension(IMAGE_SYNTAX_EXTENSION, {
        blockId: config.blockId,
      }),
      configExtension(ClipboardExtension, {
        blockId: config.blockId,
      }),
    ],
    onError(error) {
      throw error;
    },
  });
}
