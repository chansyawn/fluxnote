import { copyToClipboard, setLexicalClipboardDataTransfer } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, COPY_COMMAND } from "lexical";
import { useEffect } from "react";

import { $createClipboardDataFromCurrentSelection } from "./clipboard-data";

export function ClipboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        const data = $createClipboardDataFromCurrentSelection(editor);
        if (data === null) {
          return false;
        }

        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
          setLexicalClipboardDataTransfer(event.clipboardData, data);
          return true;
        }

        void copyToClipboard(editor, null, data);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
