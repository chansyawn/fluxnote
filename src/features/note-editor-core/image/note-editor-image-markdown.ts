import type { ElementTransformer } from "@lexical/markdown";
import { type ElementNode, type LexicalNode } from "lexical";

import {
  $createNoteEditorImageNode,
  $isNoteEditorImageNode,
  NoteEditorImageNode,
} from "./note-editor-image-node";

const IMAGE_REGEXP = /^!\[([^\]]*)\]\(([^)\n]+)\)\s?$/;

export const NOTE_EDITOR_IMAGE_TRANSFORMER: ElementTransformer = {
  dependencies: [NoteEditorImageNode],

  export: (node: LexicalNode) => {
    if (!$isNoteEditorImageNode(node)) {
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

    const imageNode = $createNoteEditorImageNode({
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
