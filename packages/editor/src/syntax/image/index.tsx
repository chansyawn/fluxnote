import { mergeRegister } from "@lexical/utils";
import { defineExtension } from "lexical";

import { BlockEditorRuntimeExtension } from "../../runtime/runtime-extension";
import { registerImageInsertCommands } from "./image-insert-commands";
import { ImageNode } from "./image-node";
import { registerImageOutlineCommands } from "./image-outline-commands";
import { registerImageSelectionCommands } from "./image-selection-commands";
import { IMAGE } from "./image-shortcut";

export { $createImageNode, $isImageNode, ImageNode, type SerializedImageNode } from "./image-node";
export type { ImagePayload } from "../../assets/image-payload";
export { imageFromLexical, imageToLexical } from "./lexical";
export { IMAGE } from "./image-shortcut";

export const IMAGE_MARKDOWN_SHORTCUT_TRANSFORMERS = [IMAGE];

export const IMAGE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/image",
  dependencies: [BlockEditorRuntimeExtension],
  nodes: [ImageNode],
  register(editor, _config, state) {
    const runtime = state.getDependency(BlockEditorRuntimeExtension).config.runtime;

    return mergeRegister(
      registerImageOutlineCommands(editor),
      registerImageInsertCommands(editor, runtime),
      registerImageSelectionCommands(editor),
    );
  },
});
