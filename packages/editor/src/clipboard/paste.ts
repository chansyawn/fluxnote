import { $isCodeNode } from "@lexical/code";
import type { BaseSelection, LexicalEditor, PasteCommandType } from "lexical";
import { $getSelection, $isRangeSelection, $setSelection } from "lexical";

import { getSupportedImageFiles } from "../assets/image-files";
import type { BlockEditorRuntime } from "../runtime/types";
import { insertImageFilesAtSelection } from "../syntax/image/image-insert";
import { rewriteHtmlFileImageSources, rewriteMarkdownFileImageSources } from "./asset-rewrites";
import { isInternalClipboardHtml } from "./internal-clipboard-html";
import { insertMarkdownAtSelection } from "./markdown-paste";
import { insertRichTextDataAtSelection } from "./rich-text-paste";

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

function selectionIsInsideCodeBlock(selection: BaseSelection | null): boolean {
  if (!$isRangeSelection(selection)) return false;

  let node: ReturnType<typeof selection.anchor.getNode> | null = selection.anchor.getNode();
  while (node) {
    if ($isCodeNode(node)) return true;
    node = node.getParent();
  }

  return false;
}

function insertRawClipboardTextAtSelection(
  editor: LexicalEditor,
  plainText: string,
  selection: BaseSelection | null,
): void {
  editor.update(() => {
    if (selection) {
      $setSelection(selection.clone());
    }

    const currentSelection = $getSelection();
    if ($isRangeSelection(currentSelection)) {
      currentSelection.insertRawText(plainText);
    }
  });
}

function handleCodeBlockPaste(
  editor: LexicalEditor,
  event: PasteCommandType,
  clipboardData: ClipboardDataSnapshot,
  selection: BaseSelection | null,
): boolean {
  const isInsideCodeBlock = editor.read(() => selectionIsInsideCodeBlock(selection));
  if (!isInsideCodeBlock) {
    return false;
  }

  claimPaste(event);
  if (clipboardData.plainText) {
    insertRawClipboardTextAtSelection(editor, clipboardData.plainText, selection);
  }
  return true;
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
  if (handleCodeBlockPaste(editor, event, clipboardDataSnapshot, selection)) {
    return true;
  }

  if (clipboardDataSnapshot.files.length > 0) {
    claimPaste(event);
    void insertImageFilesAtSelection(editor, runtime, clipboardDataSnapshot.files, selection);
    return true;
  }

  if (
    clipboardDataSnapshot.html &&
    clipboardDataSnapshot.plainText &&
    isInternalClipboardHtml(clipboardDataSnapshot.html)
  ) {
    claimPaste(event);
    void insertPlainTextClipboardDataAtSelection(
      editor,
      runtime,
      clipboardDataSnapshot.plainText,
      selection,
    );
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
