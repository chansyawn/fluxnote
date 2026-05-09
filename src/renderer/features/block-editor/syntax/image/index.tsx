import "./index.css";
import { mergeRegister } from "@lexical/utils";
import { defineExtension } from "lexical";

import { UNAVAILABLE_BLOCK_EDITOR_RUNTIME } from "../../core/runtime-defaults";
import type { BlockEditorRuntime } from "../../core/types";
import type { SyntaxRegistration } from "../registration";
import { registerImageInsertCommands } from "./image-insert-commands";
import { $isImageNode, ImageNode } from "./image-node";
import { registerImageOutlineCommands } from "./image-outline-commands";
import { registerImageSelectionCommands } from "./image-selection-commands";
import { IMAGE } from "./image-shortcut";
import { imageFromLexical, imageToLexical } from "./lexical";
import { imageFromMdast, imageToMdast } from "./mdast";

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
  runtime: BlockEditorRuntime;
}

export const IMAGE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/image",
  config: {
    runtime: UNAVAILABLE_BLOCK_EDITOR_RUNTIME,
  } satisfies ImageSyntaxExtensionConfig,
  nodes: [ImageNode],
  register(editor, config) {
    return mergeRegister(
      registerImageOutlineCommands(editor),
      registerImageInsertCommands(editor, config.runtime),
      registerImageSelectionCommands(editor),
    );
  },
});

export const IMAGE_SYNTAX = {
  id: "image",
  extension: IMAGE_SYNTAX_EXTENSION,
  lexical: {
    fromInline: (node) => ($isImageNode(node) ? [imageFromLexical(node)] : null),
    toInline: (node) => (node.type === "image" ? [imageToLexical(node)] : null),
  },
  lexicalNodeNames: ["ImageNode"],
  markdownShortcuts: IMAGE_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromInline: (node) => (node.type === "image" ? [imageFromMdast(node)] : null),
    toInline: (node) => (node.type === "image" ? [imageToMdast(node)] : null),
  },
  mdastTypes: ["image"],
  semanticTypes: ["image"],
} satisfies SyntaxRegistration;
