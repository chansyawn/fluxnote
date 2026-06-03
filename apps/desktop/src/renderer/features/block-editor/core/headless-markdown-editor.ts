import { LexicalBuilder } from "@lexical/extension";
import type { LexicalEditor } from "lexical";

import { createBlockEditorCoreExtension } from "./block-editor-core-extension";

export function createHeadlessMarkdownEditor(): LexicalEditor {
  return LexicalBuilder.fromExtensions([createBlockEditorCoreExtension()]).buildEditor();
}
