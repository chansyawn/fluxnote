import { RichTextExtension, type EscapeFormatTriggerConfig } from "@lexical/rich-text";
import { configExtension, defineExtension } from "lexical";

import { CursorExtension } from "../cursor";
import { MarkdownShortcutExtension } from "../markdown/markdown-shortcut-extension";
import { SYNTAX_EXTENSIONS, SYNTAX_MARKDOWN_SHORTCUTS } from "../syntax/registry";

export const BLOCK_EDITOR_NAMESPACE = "BLOCK_EDITOR";

const INLINE_FORMAT_ESCAPE_TRIGGERS = {
  bold: { onlyAtBoundary: true, enter: true, click: true, arrow: true },
  code: { onlyAtBoundary: true, enter: true, click: true, arrow: true },
  italic: { onlyAtBoundary: true, enter: true, click: true, arrow: true },
  strikethrough: { onlyAtBoundary: true, enter: true, click: true, arrow: true },
} satisfies EscapeFormatTriggerConfig;

export function createBlockEditorCoreExtension() {
  return defineExtension({
    name: "fluxnotes/block-editor/core",
    namespace: BLOCK_EDITOR_NAMESPACE,
    dependencies: [
      configExtension(RichTextExtension, {
        escapeFormatTriggers: INLINE_FORMAT_ESCAPE_TRIGGERS,
      }),
      ...SYNTAX_EXTENSIONS,
      configExtension(MarkdownShortcutExtension, {
        transformers: Array.from(SYNTAX_MARKDOWN_SHORTCUTS),
      }),
      CursorExtension,
    ],
    onError(error) {
      throw error;
    },
  });
}
