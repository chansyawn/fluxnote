import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, COPY_COMMAND, PASTE_COMMAND, type PasteCommandType } from "lexical";
import { useEffect } from "react";

import { createClipboardDataFromCurrentSelection } from "./clipboard-data";
import {
  cloneCurrentSelection,
  insertClipboardPayloadAtSelection,
  insertRichTextDataAtSelection,
} from "./clipboard-insert";
import {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  parseBlockEditorClipboardPayload,
  type BlockEditorClipboardData,
  type BlockEditorClipboardPayload,
} from "./clipboard-payload";

interface ClipboardPluginProps {
  blockId: string;
}

function getClipboardData(event: PasteCommandType): DataTransfer | null {
  return "clipboardData" in event ? event.clipboardData : null;
}

function hasFileData(dataTransfer: DataTransfer): boolean {
  return (
    Array.from(dataTransfer.items).some((item) => item.kind === "file") ||
    dataTransfer.files.length > 0
  );
}

async function readBlockEditorClipboardPayload(): Promise<BlockEditorClipboardPayload | null> {
  const result = await window.clipboard?.read();
  const value = result?.data?.[BLOCK_EDITOR_CLIPBOARD_MIME];
  return value ? parseBlockEditorClipboardPayload(value) : null;
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
    const unregisterCopy = editor.registerCommand(
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
    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = getClipboardData(event);
        const selection = cloneCurrentSelection();
        const payload = clipboardData
          ? parseBlockEditorClipboardPayload(clipboardData.getData(BLOCK_EDITOR_CLIPBOARD_MIME))
          : null;

        if (payload) {
          event.preventDefault();
          event.stopPropagation();
          void insertClipboardPayloadAtSelection(editor, blockId, payload, selection);
          return true;
        }

        if (!window.clipboard?.read || clipboardData === null) {
          return false;
        }

        if (hasFileData(clipboardData)) {
          return false;
        }

        event.preventDefault();
        event.stopPropagation();
        void readBlockEditorClipboardPayload().then((readPayload) => {
          if (readPayload !== null) {
            void insertClipboardPayloadAtSelection(editor, blockId, readPayload, selection);
            return;
          }

          insertRichTextDataAtSelection(editor, clipboardData, selection);
        });
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return () => {
      unregisterCopy();
      unregisterPaste();
    };
  }, [blockId, editor]);

  return null;
}
