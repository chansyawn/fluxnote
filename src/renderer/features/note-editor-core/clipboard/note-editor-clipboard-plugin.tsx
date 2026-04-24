import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, COPY_COMMAND } from "lexical";
import { useEffect } from "react";

import {
  canWriteClipboardPayloadAsynchronously,
  collectClipboardPayload,
  writeClipboardPayloadToDataTransfer,
  writeClipboardPayloadToNavigatorClipboard,
} from "./note-editor-clipboard-utils";

export function NoteEditorClipboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent | null>(
      COPY_COMMAND,
      (event) => {
        const payload = collectClipboardPayload(editor, "selection");
        if (!payload) {
          return false;
        }

        const clipboardData = event?.clipboardData;
        if (clipboardData) {
          event.preventDefault();
          writeClipboardPayloadToDataTransfer(clipboardData, payload);

          if (payload.singleSelectedImage || payload.hasUncachedInternalImages) {
            void writeClipboardPayloadToNavigatorClipboard(payload);
          }

          return true;
        }

        if (!canWriteClipboardPayloadAsynchronously()) {
          return false;
        }

        event?.preventDefault();
        void writeClipboardPayloadToNavigatorClipboard(payload);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
