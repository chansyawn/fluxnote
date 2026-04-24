import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createNodeSelection,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  mergeRegister,
} from "lexical";
import { useEffect } from "react";

import type { NoteEditorImageNode } from "./note-editor-image-node";
import { $isNoteEditorImageNode } from "./note-editor-image-node";

/**
 * Handles keyboard navigation between text and image nodes.
 *
 * Interaction rules:
 * - When cursor is at the end of text and user presses ↓/Delete → select next image
 * - When cursor is at the start of text and user presses ↑/Backspace → select previous image
 * - This prevents accidentally skipping over images during navigation/deletion
 * - Once image is selected, arrow keys move cursor before/after the image (handled in image component)
 */

function $selectImageNode(imageNode: NoteEditorImageNode) {
  const nodeSelection = $createNodeSelection();
  nodeSelection.add(imageNode.getKey());
  $setSelection(nodeSelection);
}

function createNavigationHandler(direction: "forward" | "backward") {
  return (event: KeyboardEvent) => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return false;
    }

    const anchorNode = selection.anchor.getNode();
    const isAtBoundary =
      direction === "forward"
        ? selection.anchor.offset === anchorNode.getTextContentSize()
        : selection.anchor.offset === 0;

    if (!isAtBoundary) {
      return false;
    }

    let targetParent = anchorNode.getParent();

    if ($isElementNode(anchorNode)) {
      targetParent = anchorNode;
    }

    if (!targetParent) {
      return false;
    }

    const sibling =
      direction === "forward" ? targetParent.getNextSibling() : targetParent.getPreviousSibling();

    if ($isNoteEditorImageNode(sibling)) {
      event.preventDefault();
      $selectImageNode(sibling);
      return true;
    }

    return false;
  };
}

export function NoteEditorImageNavigationPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const forwardHandler = createNavigationHandler("forward");
    const backwardHandler = createNavigationHandler("backward");

    return mergeRegister(
      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, forwardHandler, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_DELETE_COMMAND, forwardHandler, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_UP_COMMAND, backwardHandler, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, backwardHandler, COMMAND_PRIORITY_LOW),
    );
  }, [editor]);

  return null;
}
