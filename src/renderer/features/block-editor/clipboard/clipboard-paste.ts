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
  files: File[];
  html: string;
  markdown: string;
  plainText: string;
  rawHtml: string;
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

  const html = dataByType.get("text/html") ?? "";
  const markdown = dataByType.get("text/markdown") ?? "";
  const plainText = dataByType.get("text/plain") ?? "";
  const rawHtml = dataTransfer.getData("text/html");

  return {
    files: getSupportedImageFiles(dataTransfer),
    html,
    markdown,
    plainText,
    rawHtml,
    getData: (type: string) => dataByType.get(type) ?? "",
  };
}

function claimPaste(event: PasteCommandType): void {
  event.preventDefault();
  event.stopPropagation();
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

  const clipboardDataSnapshot = createClipboardDataSnapshot(clipboardData);
  if (clipboardDataSnapshot.files.length > 0) {
    claimPaste(event);
    void insertImageFilesAtSelection(editor, runtime, clipboardDataSnapshot.files, selection);
    return true;
  }

  const eventPayload = decodeBlockEditorClipboardHtml(clipboardDataSnapshot.rawHtml);
  if (eventPayload) {
    claimPaste(event);
    void insertClipboardPayloadAtSelection(editor, runtime, eventPayload, selection);
    return true;
  }

  claimPaste(event);
  const markdown = clipboardDataSnapshot.markdown || clipboardDataSnapshot.plainText;
  if (markdown && insertMarkdownTablesAtSelection(editor, markdown, selection)) {
    return true;
  }

  insertRichTextDataAtSelection(editor, clipboardDataSnapshot, selection);
  return true;
}
