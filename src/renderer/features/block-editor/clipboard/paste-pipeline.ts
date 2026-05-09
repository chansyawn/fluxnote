import {
  decodeBlockEditorClipboardHtml,
  stripBlockEditorClipboardHtmlMetadata,
} from "@shared/features/block-editor/clipboard";
import type { BaseSelection, LexicalEditor, PasteCommandType } from "lexical";

import { getSupportedImageFiles } from "../assets/image-files";
import { insertImageFilesAtSelection } from "../assets/image-insert";
import type { BlockEditorRuntime } from "../core/types";
import { insertMarkdownTablesAtSelection } from "../syntax/table";
import {
  insertClipboardPayloadAtSelection,
  insertRichTextDataAtSelection,
} from "./clipboard-insert";

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

export function handleBlockEditorPaste(
  editor: LexicalEditor,
  runtime: BlockEditorRuntime,
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
    void insertImageFilesAtSelection(editor, runtime, files, selection);
    return true;
  }

  const eventPayload = decodeBlockEditorClipboardHtml(clipboardData.getData("text/html"));
  if (eventPayload) {
    event.preventDefault();
    event.stopPropagation();
    void insertClipboardPayloadAtSelection(editor, runtime, eventPayload, selection);
    return true;
  }

  const clipboardDataSnapshot = createClipboardDataSnapshot(clipboardData);
  event.preventDefault();
  event.stopPropagation();
  const markdown =
    clipboardDataSnapshot.getData("text/markdown") || clipboardDataSnapshot.getData("text/plain");
  if (markdown && insertMarkdownTablesAtSelection(editor, markdown, selection)) {
    return true;
  }

  insertRichTextDataAtSelection(editor, clipboardDataSnapshot, selection);
  return true;
}
