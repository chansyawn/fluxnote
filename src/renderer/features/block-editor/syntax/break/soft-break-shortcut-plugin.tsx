import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from "lexical";
import { useEffect } from "react";

import { $createSoftBreakNode } from "./soft-break-node";

export function applySoftBreakAtSelection(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  selection.insertNodes([$createSoftBreakNode()]);
  return true;
}

export function registerSoftBreakShortcut(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (!event?.shiftKey) {
        return false;
      }

      event.preventDefault();
      return applySoftBreakAtSelection();
    },
    COMMAND_PRIORITY_CRITICAL,
  );
}

export function SoftBreakShortcutPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => registerSoftBreakShortcut(editor), [editor]);

  return null;
}
