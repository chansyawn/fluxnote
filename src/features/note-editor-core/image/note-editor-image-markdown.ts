import type { TextMatchTransformer } from "@lexical/markdown";
import type { LexicalNode } from "lexical";

import {
  $createNoteEditorImageNode,
  $isNoteEditorImageNode,
  NoteEditorImageNode,
} from "./note-editor-image-node";

const IMAGE_IMPORT_REGEXP = /!\[([^\]]*)\]\(([^)\n]+)\)/;
const IMAGE_SHORTCUT_REGEXP = /!\[([^\]]*)\]\(([^)\n]+)\)$/;

function createImageNodeFromMatch(match: RegExpMatchArray): NoteEditorImageNode {
  const [, altText = "", src = ""] = match;

  return $createNoteEditorImageNode({
    altText,
    src: src.trim(),
  });
}

export const NOTE_EDITOR_IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [NoteEditorImageNode],
  export: (node: LexicalNode) => {
    return $isNoteEditorImageNode(node) ? `![${node.getAltText()}](${node.getSrc()})` : null;
  },
  importRegExp: IMAGE_IMPORT_REGEXP,
  regExp: IMAGE_SHORTCUT_REGEXP,
  replace: (textNode, match) => {
    textNode.replace(createImageNodeFromMatch(match));
  },
  trigger: ")",
  type: "text-match",
};
