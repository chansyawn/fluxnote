import { $createParagraphNode, $isParagraphNode, $isTextNode } from "lexical";

import type { NoteEditorImageNode } from "./note-editor-image-node";

/**
 * Moves cursor to after the image node.
 * If next sibling is editable (paragraph/text), moves cursor there.
 * Otherwise creates a new paragraph after the image.
 */
export function $moveCaretAfterImage(imageNode: NoteEditorImageNode): void {
  const nextSibling = imageNode.getNextSibling();

  if (nextSibling && ($isParagraphNode(nextSibling) || $isTextNode(nextSibling))) {
    nextSibling.selectStart();
  } else {
    const paragraph = $createParagraphNode();
    imageNode.insertAfter(paragraph);
    paragraph.select();
  }
}

/**
 * Moves cursor to before the image node.
 * If previous sibling is editable (paragraph/text), moves cursor there.
 * Otherwise creates a new paragraph before the image.
 */
export function $moveCaretBeforeImage(imageNode: NoteEditorImageNode): void {
  const prevSibling = imageNode.getPreviousSibling();

  if (prevSibling && ($isParagraphNode(prevSibling) || $isTextNode(prevSibling))) {
    prevSibling.selectEnd();
  } else {
    const paragraph = $createParagraphNode();
    imageNode.insertBefore(paragraph);
    paragraph.select();
  }
}
