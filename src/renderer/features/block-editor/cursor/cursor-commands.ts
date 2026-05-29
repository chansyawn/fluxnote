import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  mergeRegister,
  type LexicalEditor,
  type PasteCommandType,
} from "lexical";

import { $selectAdjacentBoundaryFromSelection, $moveGapCursorSelection } from "./cursor-navigation";
import { $promoteGapCursorParagraph } from "./cursor-state";

function $promoteSelectionGapCursor(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  return $promoteGapCursorParagraph(selection.anchor.getNode().getTopLevelElement());
}

function handleArrow(event: KeyboardEvent, direction: "backward" | "forward"): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }

  const handled = $moveGapCursorSelection(direction);
  if (handled) {
    event.preventDefault();
  }
  return handled;
}

function handleEnter(event: KeyboardEvent | null): boolean {
  if (event?.altKey || event?.ctrlKey || event?.metaKey || event?.shiftKey) {
    return false;
  }

  const handled = $promoteSelectionGapCursor();
  if (handled) {
    event?.preventDefault();
  }
  return handled;
}

function handleGapDelete(event: KeyboardEvent, direction: "backward" | "forward"): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }

  const handled = $selectAdjacentBoundaryFromSelection(direction);
  if (handled) {
    event.preventDefault();
  }
  return handled;
}

export function registerCursorCommands(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      (event) => handleArrow(event, "backward"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => handleArrow(event, "backward"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => handleArrow(event, "forward"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => handleArrow(event, "forward"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(KEY_ENTER_COMMAND, handleEnter, COMMAND_PRIORITY_CRITICAL),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => handleGapDelete(event, "backward"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => handleGapDelete(event, "forward"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => $promoteSelectionGapCursor(),
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      () => {
        $promoteSelectionGapCursor();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      PASTE_COMMAND,
      (_event: PasteCommandType) => {
        $promoteSelectionGapCursor();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
}
