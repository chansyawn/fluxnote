import { defineExtension } from "lexical";
import { COMMAND_PRIORITY_CRITICAL, COPY_COMMAND, PASTE_COMMAND } from "lexical";

import { createClipboardDataFromCurrentSelection } from "./clipboard-data";
import { cloneCurrentSelection } from "./clipboard-insert";
import { handleBlockEditorPaste, writeBlockEditorClipboardData } from "./paste-pipeline";

export interface ClipboardExtensionConfig {
  blockId: string;
}

export { createClipboardDataSnapshot, writeBlockEditorClipboardData } from "./paste-pipeline";

export const ClipboardExtension = defineExtension({
  name: "fluxnotes/block-editor/clipboard",
  config: {
    blockId: "",
  } satisfies ClipboardExtensionConfig,
  register(editor, config) {
    const unregisterCopy = editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
        }

        void createClipboardDataFromCurrentSelection(editor, config.blockId).then((request) => {
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
      (event) => handleBlockEditorPaste(editor, config.blockId, event, cloneCurrentSelection()),
      COMMAND_PRIORITY_CRITICAL,
    );

    return () => {
      unregisterCopy();
      unregisterPaste();
    };
  },
});
