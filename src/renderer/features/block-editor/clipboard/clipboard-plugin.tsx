import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, COPY_COMMAND } from "lexical";
import { useEffect } from "react";

import { createClipboardDataFromCurrentSelection } from "./clipboard-data";
import type { BlockEditorClipboardData } from "./clipboard-payload";

interface ClipboardPluginProps {
  blockId: string;
}

export async function writeBlockEditorClipboardData(data: BlockEditorClipboardData): Promise<void> {
  const clipboardBridge = typeof window !== "undefined" ? window.clipboard : undefined;
  if (clipboardBridge) {
    await clipboardBridge.write(data);
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(data["text/plain"]);
    return;
  }

  throw new Error("Clipboard API is unavailable.");
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
