import { configExtension, defineExtension } from "lexical";

import { MarkdownShortcutExtension } from "../markdown/markdown-shortcut-extension";
import { SYNTAX_EXTENSIONS, SYNTAX_MARKDOWN_SHORTCUTS } from "../syntax/registry";

export function createBlockEditorCoreExtension(namespace = "BlockEditorCore") {
  return defineExtension({
    name: "fluxnotes/block-editor/core",
    namespace,
    dependencies: [
      ...SYNTAX_EXTENSIONS,
      configExtension(MarkdownShortcutExtension, {
        transformers: Array.from(SYNTAX_MARKDOWN_SHORTCUTS),
      }),
    ],
    onError(error) {
      throw error;
    },
  });
}
