import { $isHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  mergeRegister,
  type LexicalEditor,
} from "lexical";

import {
  getNearestAncestor,
  getSelectionAnchorNode,
  isCursorAtElementStart,
} from "../container/selection";

function hasModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function handleBackspace(event: KeyboardEvent): boolean {
  if (hasModifier(event)) {
    return false;
  }

  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  const heading = anchorNode ? getNearestAncestor(anchorNode, $isHeadingNode) : null;
  if (!heading || !isCursorAtElementStart(selection, heading)) {
    return false;
  }

  event.preventDefault();
  $setBlocksType(selection, () => $createParagraphNode());
  return true;
}

export function registerHeadingKeyboardCommands(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(KEY_BACKSPACE_COMMAND, handleBackspace, COMMAND_PRIORITY_HIGH),
  );
}
