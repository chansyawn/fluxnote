import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_CRITICAL, COPY_COMMAND, PASTE_COMMAND } from "lexical";
import { useEffect } from "react";

import { createClipboardDataFromCurrentSelection } from "./clipboard-data";
import { cloneCurrentSelection } from "./clipboard-insert";
import { handleBlockEditorPaste, writeBlockEditorClipboardData } from "./paste-pipeline";

interface ClipboardPluginProps {
  blockId: string;
}

export { createClipboardDataSnapshot, writeBlockEditorClipboardData } from "./paste-pipeline";

export function ClipboardPlugin({ blockId }: ClipboardPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterCopy = editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
        }

        void createClipboardDataFromCurrentSelection(editor, blockId).then((request) => {
          if (request !== null) {
            void writeBlockEditorClipboardData(request);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => handleBlockEditorPaste(editor, blockId, event, cloneCurrentSelection()),
      COMMAND_PRIORITY_CRITICAL,
    );
    return () => {
      unregisterCopy();
      unregisterPaste();
    };
  }, [blockId, editor]);

  return null;
}
