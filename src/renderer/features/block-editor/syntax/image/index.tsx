import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { ImageInsertPlugin } from "./image-insert-plugin";
import { ImageNode } from "./image-node";
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
export {
  createImagePayloadFromFile,
  getSupportedImageFiles,
  hasSupportedImageData,
  isSupportedImageFile,
  isSupportedImageMimeType,
} from "./image-file";
export { IMAGE } from "./image-shortcut";

export const IMAGE_SYNTAX = {
  id: "image",
  lexicalNodeNames: ["ImageNode"],
  markdownShortcuts: [IMAGE],
  mdastTypes: ["image"],
  nodes: [ImageNode],
  runtimePlugins: ({ blockId }) => [<ImageInsertPlugin key="image-insert" blockId={blockId} />],
  semanticTypes: ["image"],
} satisfies SyntaxRegistration;
