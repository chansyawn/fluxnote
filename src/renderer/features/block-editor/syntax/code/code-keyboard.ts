import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from "lexical";

import { applyAltEnterAtCodeSelection } from "./code-structure";

export function registerCodeKeyboardCommands(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (!event?.altKey || event.shiftKey) {
        return false;
      }

      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      const handled = applyAltEnterAtCodeSelection(selection);
      if (handled) {
        event.preventDefault();
      }
      return handled;
    },
    COMMAND_PRIORITY_CRITICAL,
  );
}
