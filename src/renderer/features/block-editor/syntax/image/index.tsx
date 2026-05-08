import "./index.css";
import { mergeRegister } from "@lexical/utils";
import { configExtension, defineExtension } from "lexical";

import { MarkdownShortcutExtension } from "../../markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";
import { registerImageInsertCommands } from "./image-insert-commands";
import { ImageNode } from "./image-node";
import { registerImageOutlineCommands } from "./image-outline-commands";
import { registerImageSelectionCommands } from "./image-selection-commands";
import { IMAGE } from "./image-shortcut";

export {
  $createImageNode,
  $isImageNode,
  ImageNode,
  type ImagePayload,
  type SerializedImageNode,
} from "./image-node";
export { imageFromLexical, imageToLexical } from "./lexical";
export { imageFromMdast, imageToMdast } from "./mdast";
export { IMAGE } from "./image-shortcut";

export const IMAGE_MARKDOWN_SHORTCUT_TRANSFORMERS = [IMAGE];

export interface ImageSyntaxExtensionConfig {
  blockId: string;
}

export const IMAGE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/image",
  config: {
    blockId: "",
  } satisfies ImageSyntaxExtensionConfig,
  dependencies: [
    configExtension(MarkdownShortcutExtension, {
      transformers: IMAGE_MARKDOWN_SHORTCUT_TRANSFORMERS,
    }),
  ],
  nodes: [ImageNode],
  register(editor, config) {
    return mergeRegister(
      registerImageOutlineCommands(editor),
      registerImageInsertCommands(editor, config.blockId),
      registerImageSelectionCommands(editor),
    );
  },
});

export const IMAGE_SYNTAX = {
  id: "image",
  extension: IMAGE_SYNTAX_EXTENSION,
  lexicalNodeNames: ["ImageNode"],
  mdastTypes: ["image"],
  semanticTypes: ["image"],
} satisfies SyntaxRegistration;
