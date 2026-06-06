import { $isCodeNode, type CodeNode } from "@lexical/code";
import type {
  BaseSelection,
  LexicalEditor,
  LexicalNode,
  PasteCommandType,
  PointType,
} from "lexical";
import { $createTextNode, $getSelection, $isRangeSelection, $setSelection } from "lexical";

import { getSupportedImageFiles } from "../assets/image-files";
import type { BlockEditorRuntime } from "../runtime/types";
import { insertImageFilesAtSelection } from "../syntax/image/image-insert";
import { rewriteHtmlFileImageSources, rewriteMarkdownFileImageSources } from "./asset-rewrites";
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

function getNearestCodeNode(node: LexicalNode): CodeNode | null {
  let current: LexicalNode | null = node;
  while (current) {
    if ($isCodeNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

function selectionIsInsideCodeBlock(selection: BaseSelection | null): boolean {
  if (!$isRangeSelection(selection)) return false;
  return getNearestCodeNode(selection.anchor.getNode()) !== null;
}

function getOffsetBeforeNode(node: LexicalNode, boundary: CodeNode): number {
  let offset = 0;
  let current: LexicalNode | null = node;

  while (current && !current.is(boundary)) {
    for (const sibling of current.getPreviousSiblings()) {
      offset += sibling.getTextContentSize();
    }
    current = current.getParent();
  }

  return offset;
}

function getCodePointOffset(point: PointType, codeNode: CodeNode): number | null {
  const node = point.getNode();
  if (!getNearestCodeNode(node)?.is(codeNode)) {
    return null;
  }

  if (point.type === "text") {
    return getOffsetBeforeNode(node, codeNode) + point.offset;
  }

  if (node.is(codeNode)) {
    return point.offset === 0 ? 0 : codeNode.getTextContentSize();
  }

  return getOffsetBeforeNode(node, codeNode);
}

function insertPlainTextInsideCodeBlock(
  editor: LexicalEditor,
  plainText: string,
  selection: BaseSelection | null,
): boolean {
  let handled = false;
  editor.update(() => {
    if (selection) {
      $setSelection(selection.clone());
    }

    const currentSelection = $getSelection();
    if (!$isRangeSelection(currentSelection)) {
      return;
    }

    const codeNode = getNearestCodeNode(currentSelection.anchor.getNode());
    if (!codeNode) {
      return;
    }

    const anchorOffset = getCodePointOffset(currentSelection.anchor, codeNode);
    const focusOffset = getCodePointOffset(currentSelection.focus, codeNode);
    if (anchorOffset === null || focusOffset === null) {
      return;
    }

    const startOffset = Math.min(anchorOffset, focusOffset);
    const endOffset = Math.max(anchorOffset, focusOffset);
    const codeText = codeNode.getTextContent();
    const nextText = `${codeText.slice(0, startOffset)}${plainText}${codeText.slice(endOffset)}`;
    const caretOffset = startOffset + plainText.length;

    codeNode.clear();
    if (nextText.length === 0) {
      codeNode.select(0, 0);
    } else {
      const textNode = $createTextNode(nextText);
      codeNode.append(textNode);
      textNode.select(caretOffset, caretOffset);
    }
    handled = true;
  });
  return handled;
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
    insertPlainTextInsideCodeBlock(editor, clipboardData.plainText, selection);
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
