import { defineExtension } from "lexical";

import { MarkdownShortcutExtension } from "./markdown-shortcut-extension";
import { SYNTAX_EXTENSIONS } from "./syntax/registry";

export function createBlockEditorCoreExtension(namespace = "BlockEditorCore") {
  return defineExtension({
    name: "fluxnotes/block-editor/core",
    namespace,
    dependencies: [MarkdownShortcutExtension, ...SYNTAX_EXTENSIONS],
    onError(error) {
      throw error;
    },
  });
}
