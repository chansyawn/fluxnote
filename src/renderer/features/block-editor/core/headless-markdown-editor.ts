import { LexicalBuilder } from "@lexical/extension";
import type { LexicalEditor } from "lexical";

import { createBlockEditorCoreExtension } from "./block-editor-core-extension";

export function createHeadlessMarkdownEditor(namespace = "BlockEditorHeadless"): LexicalEditor {
  return LexicalBuilder.fromExtensions([createBlockEditorCoreExtension(namespace)]).buildEditor();
}
