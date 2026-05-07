import {
  readBlockEditorClipboard,
  writeBlockEditorClipboard,
  type BlockEditorClipboardWriteRequest,
} from "@renderer/clients";
import type { BaseSelection, LexicalEditor, PasteCommandType } from "lexical";

import { getSupportedImageFiles } from "../assets/image-files";
import {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  decodeBlockEditorClipboardHtml,
  parseBlockEditorClipboardPayload,
  stripBlockEditorClipboardHtmlMetadata,
} from "./clipboard-codec";
import {
  insertClipboardPayloadAtSelection,
  insertRichTextDataAtSelection,
} from "./clipboard-insert";
import { insertImageFilesAtSelection } from "./image-insert";

interface ClipboardDataSnapshot {
  getData(type: string): string;
}

export function getClipboardData(event: PasteCommandType): DataTransfer | null {
  return "clipboardData" in event ? event.clipboardData : null;
}

export function createClipboardDataSnapshot(dataTransfer: DataTransfer): ClipboardDataSnapshot {
  const dataByType = new Map<string, string>();
  for (const type of Array.from(dataTransfer.types)) {
    const value = dataTransfer.getData(type);
    dataByType.set(
      type,
      type === "text/html" ? stripBlockEditorClipboardHtmlMetadata(value) : value,
    );
  }

  return {
    getData: (type: string) => dataByType.get(type) ?? "",
  };
}

export async function writeBlockEditorClipboardData(
  request: BlockEditorClipboardWriteRequest,
): Promise<void> {
  try {
    await writeBlockEditorClipboard(request);
    return;
  } catch {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(request.text);
      return;
    }

    throw new Error("Clipboard API is unavailable.");
  }
}

async function insertPayloadFromSystemClipboard(
  editor: LexicalEditor,
  blockId: string,
  selection: BaseSelection | null,
  fallback: () => void,
): Promise<void> {
  try {
    const result = await readBlockEditorClipboard();
    if (result.payload) {
      await insertClipboardPayloadAtSelection(editor, blockId, result.payload, selection);
      return;
    }
  } catch {
    // Paste should still insert standard clipboard content when the app payload is unavailable.
  }

  fallback();
}

export function handleBlockEditorPaste(
  editor: LexicalEditor,
  blockId: string,
  event: PasteCommandType,
  selection: BaseSelection | null,
): boolean {
  const clipboardData = getClipboardData(event);
  if (clipboardData === null) {
    return false;
  }

  const files = getSupportedImageFiles(clipboardData);
  if (files.length > 0) {
    event.preventDefault();
    event.stopPropagation();
    void insertImageFilesAtSelection(editor, blockId, files, selection);
    return true;
  }

  const eventPayload =
    decodeBlockEditorClipboardHtml(clipboardData.getData("text/html")) ??
    parseBlockEditorClipboardPayload(clipboardData.getData(BLOCK_EDITOR_CLIPBOARD_MIME));
  if (eventPayload) {
    event.preventDefault();
    event.stopPropagation();
    void insertClipboardPayloadAtSelection(editor, blockId, eventPayload, selection);
    return true;
  }

  const clipboardDataSnapshot = createClipboardDataSnapshot(clipboardData);
  event.preventDefault();
  event.stopPropagation();
  void insertPayloadFromSystemClipboard(editor, blockId, selection, () => {
    insertRichTextDataAtSelection(editor, clipboardDataSnapshot, selection);
  });
  return true;
}
