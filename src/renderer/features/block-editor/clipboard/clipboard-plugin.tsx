import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, COPY_COMMAND } from "lexical";
import { useEffect } from "react";

import {
  createClipboardDataFromCurrentSelection,
  type BlockEditorClipboardData,
} from "./clipboard-data";
import { BLOCK_EDITOR_CLIPBOARD_MIME } from "./clipboard-payload";

interface ClipboardPluginProps {
  blockId: string;
}

export async function writeBlockEditorClipboardData(data: BlockEditorClipboardData): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        [BLOCK_EDITOR_CLIPBOARD_MIME]: new Blob([data[BLOCK_EDITOR_CLIPBOARD_MIME]], {
          type: BLOCK_EDITOR_CLIPBOARD_MIME,
        }),
        "text/html": new Blob([data["text/html"]], { type: "text/html" }),
        "text/plain": new Blob([data["text/plain"]], { type: "text/plain" }),
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(data["text/plain"]);
}

export function ClipboardPlugin({ blockId }: ClipboardPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
          void createClipboardDataFromCurrentSelection(editor, blockId).then((data) => {
            if (data !== null) {
              void writeBlockEditorClipboardData(data);
            }
          });
          return true;
        }

        void createClipboardDataFromCurrentSelection(editor, blockId).then((data) => {
          if (data !== null) {
            void writeBlockEditorClipboardData(data);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [blockId, editor]);

  return null;
}
