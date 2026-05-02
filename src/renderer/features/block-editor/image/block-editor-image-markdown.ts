import type { ElementTransformer } from "@lexical/markdown";
import { type ElementNode, type LexicalNode } from "lexical";

import {
  $createBlockEditorImageNode,
  $isBlockEditorImageNode,
  BlockEditorImageNode,
} from "./block-editor-image-node";

const IMAGE_REGEXP = /^!\[([^\]]*)\]\(([^)\n]+)\)\s?$/;

export const BLOCK_EDITOR_IMAGE_TRANSFORMER: ElementTransformer = {
  dependencies: [BlockEditorImageNode],

  export: (node: LexicalNode) => {
    if (!$isBlockEditorImageNode(node)) {
      return null;
    }
    return `![${node.getAltText()}](${node.getSrc()})`;
  },

  regExp: IMAGE_REGEXP,

  replace: (
    parentNode: ElementNode,
    _children: Array<LexicalNode>,
    match: Array<string>,
    isImport: boolean,
  ) => {
    const [, altText = "", src = ""] = match;

    const imageNode = $createBlockEditorImageNode({
      altText,
      src: src.trim(),
    });

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(imageNode);
    } else {
      parentNode.insertBefore(imageNode);
    }

    imageNode.selectNext();
  },

  type: "element",
};
