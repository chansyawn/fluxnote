import "./index.css";
import { defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import { ImageInsertPlugin } from "./image-insert-plugin";
import { ImageNode } from "./image-node";
import { ImageOutlinePlugin } from "./image-outline-plugin";
import { ImageSelectionPlugin } from "./image-selection-plugin";
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

export const IMAGE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/image",
  nodes: [ImageNode],
});

export const IMAGE_SYNTAX = {
  id: "image",
  extension: IMAGE_SYNTAX_EXTENSION,
  lexicalNodeNames: ["ImageNode"],
  markdownShortcuts: [IMAGE],
  mdastTypes: ["image"],
  runtimePlugins: ({ blockId }) => [
    <ImageOutlinePlugin key="image-outline" />,
    <ImageInsertPlugin key="image-insert" blockId={blockId} />,
    <ImageSelectionPlugin key="image-selection" />,
  ],
  semanticTypes: ["image"],
} satisfies SyntaxRegistration;
