import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $insertList, $isListNode, $removeList, type ListType } from "@lexical/list";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $isTableCellNode } from "@lexical/table";
import { $findMatchingParent } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalNode,
} from "lexical";

import type { BlockEditorBlockFormat, BlockEditorToolbarState } from "../toolbar/types";

const HEADING_FORMAT_TO_TAG = {
  heading1: "h1",
  heading2: "h2",
  heading3: "h3",
  heading4: "h4",
  heading5: "h5",
  heading6: "h6",
} as const satisfies Partial<Record<BlockEditorBlockFormat, `h${1 | 2 | 3 | 4 | 5 | 6}`>>;

const LIST_FORMAT_TO_TYPE = {
  bulletList: "bullet",
  orderedList: "number",
  taskList: "check",
} as const satisfies Partial<Record<BlockEditorBlockFormat, ListType>>;

const LIST_TYPE_TO_FORMAT = {
  bullet: "bulletList",
  check: "taskList",
  number: "orderedList",
} as const satisfies Record<ListType, BlockEditorBlockFormat>;

function isListFormat(format: BlockEditorBlockFormat): format is keyof typeof LIST_FORMAT_TO_TYPE {
  return format === "bulletList" || format === "orderedList" || format === "taskList";
}

function isHeadingFormat(
  format: BlockEditorBlockFormat,
): format is keyof typeof HEADING_FORMAT_TO_TAG {
  return (
    format === "heading1" ||
    format === "heading2" ||
    format === "heading3" ||
    format === "heading4" ||
    format === "heading5" ||
    format === "heading6"
  );
}

function getAnchorNode(): LexicalNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }

  return selection.anchor.getNode();
}

function getAnchorListFormat(anchorNode: LexicalNode): BlockEditorBlockFormat | null {
  const listNode = $findMatchingParent(anchorNode, $isListNode);
  if (!$isListNode(listNode)) {
    return null;
  }

  return LIST_TYPE_TO_FORMAT[listNode.getListType()];
}

export function readBlockFormatFromSelection(): BlockEditorBlockFormat {
  const anchorNode = getAnchorNode();
  if (anchorNode === null) {
    return "paragraph";
  }

  const listFormat = getAnchorListFormat(anchorNode);
  if (listFormat !== null) {
    return listFormat;
  }

  const codeNode = $findMatchingParent(anchorNode, $isCodeNode);
  if ($isCodeNode(codeNode)) {
    return "codeBlock";
  }

  const quoteNode = $findMatchingParent(anchorNode, $isQuoteNode);
  if ($isQuoteNode(quoteNode)) {
    return "blockquote";
  }

  const blockNode =
    $findMatchingParent(anchorNode, (node) => $isParagraphNode(node) || $isHeadingNode(node)) ??
    anchorNode;

  if ($isHeadingNode(blockNode)) {
    const depth = blockNode.getTag().replace("h", "");
    return `heading${depth}` as BlockEditorBlockFormat;
  }

  return "paragraph";
}

export function isBlockFormattingDisabledAtSelection(): boolean {
  const anchorNode = getAnchorNode();
  return anchorNode !== null && $findMatchingParent(anchorNode, $isTableCellNode) !== null;
}

export function toolbarStatesEqual(
  left: BlockEditorToolbarState,
  right: BlockEditorToolbarState,
): boolean {
  return (
    left.blockFormat === right.blockFormat &&
    left.blockFormattingDisabled === right.blockFormattingDisabled &&
    left.inlineFormats.bold === right.inlineFormats.bold &&
    left.inlineFormats.inlineCode === right.inlineFormats.inlineCode &&
    left.inlineFormats.italic === right.inlineFormats.italic &&
    left.inlineFormats.strikethrough === right.inlineFormats.strikethrough
  );
}

export function applyBlockFormat(format: BlockEditorBlockFormat): void {
  if (isBlockFormattingDisabledAtSelection()) {
    return;
  }

  const currentFormat = readBlockFormatFromSelection();
  const targetFormat: BlockEditorBlockFormat = currentFormat === format ? "paragraph" : format;
  const selection = $getSelection();

  if (isListFormat(targetFormat)) {
    $insertList(LIST_FORMAT_TO_TYPE[targetFormat]);
    return;
  }

  if (isListFormat(currentFormat)) {
    $removeList();
  }

  if (targetFormat === "paragraph") {
    $setBlocksType(selection, () => $createParagraphNode());
    return;
  }

  if (targetFormat === "blockquote") {
    $setBlocksType(selection, () => $createQuoteNode());
    return;
  }

  if (targetFormat === "codeBlock") {
    $setBlocksType(selection, () => $createCodeNode());
    return;
  }

  if (isHeadingFormat(targetFormat)) {
    $setBlocksType(selection, () => $createHeadingNode(HEADING_FORMAT_TO_TAG[targetFormat]));
  }
}
