import type { BaseSelection, LexicalEditor, PasteCommandType } from "lexical";

import { getSupportedImageFiles } from "../assets/image-files";
import { insertImageFilesAtSelection } from "../assets/image-insert";
import type { BlockEditorRuntime } from "../core/types";
import { rewriteHtmlFileImageSources, rewriteMarkdownFileImageSources } from "./clipboard-assets";
import { insertRichTextDataAtSelection } from "./clipboard-insert";
import { insertMarkdownAtSelection } from "./markdown-paste";

interface ClipboardDataSnapshot {
  files: File[];
  html: string;
  plainText: string;
  getData(type: string): string;
}

export function getClipboardData(event: PasteCommandType): DataTransfer | null {
  return "clipboardData" in event ? event.clipboardData : null;
}

export function createClipboardDataSnapshot(dataTransfer: DataTransfer): ClipboardDataSnapshot {
  const dataByType = new Map<string, string>();
  for (const type of Array.from(dataTransfer.types)) {
    const value = dataTransfer.getData(type);
    dataByType.set(type, value);
  }

  const html = dataByType.get("text/html") ?? "";
  const plainText = dataByType.get("text/plain") ?? "";

  return {
    files: getSupportedImageFiles(dataTransfer),
    html,
    plainText,
    getData: (type: string) => dataByType.get(type) ?? "",
  };
}

function claimPaste(event: PasteCommandType): void {
  event.preventDefault();
  event.stopPropagation();
}

async function insertHtmlClipboardDataAtSelection(
  editor: LexicalEditor,
  runtime: BlockEditorRuntime,
  clipboardData: ClipboardDataSnapshot,
  selection: BaseSelection | null,
): Promise<void> {
  const html = await rewriteHtmlFileImageSources(clipboardData.html, runtime.assets.importFiles);

  insertRichTextDataAtSelection(
    editor,
    {
      getData: (type: string) => {
        if (type === "text/html") {
          return html;
        }

        return clipboardData.getData(type);
      },
    },
    selection,
  );
}

async function insertPlainTextClipboardDataAtSelection(
  editor: LexicalEditor,
  runtime: BlockEditorRuntime,
  plainText: string,
  selection: BaseSelection | null,
): Promise<void> {
  const markdown = await rewriteMarkdownFileImageSources(plainText, runtime.assets.importFiles);
  insertMarkdownAtSelection(editor, markdown, selection);
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

  if (clipboardDataSnapshot.html) {
    claimPaste(event);
    void insertHtmlClipboardDataAtSelection(editor, runtime, clipboardDataSnapshot, selection);
    return true;
  }

  claimPaste(event);
  if (clipboardDataSnapshot.plainText) {
    void insertPlainTextClipboardDataAtSelection(
      editor,
      runtime,
      clipboardDataSnapshot.plainText,
      selection,
    );
    return true;
  }

  insertRichTextDataAtSelection(editor, clipboardDataSnapshot, selection);
  return true;
}
