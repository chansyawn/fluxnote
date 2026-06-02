import { $createCodeNode, $isCodeNode } from "@lexical/code";
import {
  $insertList,
  $isListItemNode,
  $isListNode,
  $removeList,
  type ListType,
} from "@lexical/list";
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

import { getCurrentListItem } from "../syntax/list/list-selection";
import { unwrapListItemToBlocks } from "../syntax/list/list-structure";
import { unwrapQuoteToBlocks } from "../syntax/quote/quote-structure";
import type { BlockEditorBlockFormat } from "../toolbar/types";

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

export type BlockEditorTextStyleFormat =
  | "codeBlock"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "paragraph";

export type BlockEditorListFormat = keyof typeof LIST_FORMAT_TO_TYPE;

function isListFormat(format: BlockEditorBlockFormat): format is BlockEditorListFormat {
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

function getAnchorListNode(anchorNode: LexicalNode) {
  const listNode = $findMatchingParent(anchorNode, $isListNode);
  return $isListNode(listNode) ? listNode : null;
}

function getAnchorListFormat(anchorNode: LexicalNode): BlockEditorBlockFormat | null {
  const listNode = getAnchorListNode(anchorNode);
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

export function isTextStyleActiveAtSelection(format: BlockEditorTextStyleFormat): boolean {
  const anchorNode = getAnchorNode();
  if (anchorNode === null) {
    return format === "paragraph";
  }

  const codeNode = $findMatchingParent(anchorNode, $isCodeNode);
  if ($isCodeNode(codeNode)) {
    return format === "codeBlock";
  }

  const blockNode =
    $findMatchingParent(anchorNode, (node) => $isParagraphNode(node) || $isHeadingNode(node)) ??
    anchorNode;

  if ($isHeadingNode(blockNode)) {
    return isHeadingFormat(format) && HEADING_FORMAT_TO_TAG[format] === blockNode.getTag();
  }

  return format === "paragraph";
}

export function isListFormatActiveAtSelection(format: BlockEditorListFormat): boolean {
  const anchorNode = getAnchorNode();
  if (anchorNode === null) {
    return false;
  }

  return getAnchorListFormat(anchorNode) === format;
}

export function isQuoteActiveAtSelection(): boolean {
  const anchorNode = getAnchorNode();
  return anchorNode !== null && $findMatchingParent(anchorNode, $isQuoteNode) !== null;
}

export function toggleTextStyleAtSelection(format: BlockEditorTextStyleFormat): void {
  if (isBlockFormattingDisabledAtSelection()) {
    return;
  }

  const targetFormat: BlockEditorTextStyleFormat = isTextStyleActiveAtSelection(format)
    ? "paragraph"
    : format;
  const selection = $getSelection();

  if (targetFormat === "paragraph") {
    $setBlocksType(selection, () => $createParagraphNode());
    return;
  }

  if (targetFormat === "codeBlock") {
    $setBlocksType(selection, () => $createCodeNode());
    return;
  }

  $setBlocksType(selection, () => $createHeadingNode(HEADING_FORMAT_TO_TAG[targetFormat]));
}

export function toggleListFormatAtSelection(format: BlockEditorListFormat): void {
  if (isBlockFormattingDisabledAtSelection()) {
    return;
  }

  const selection = $getSelection();
  const listItem = $isRangeSelection(selection) ? getCurrentListItem(selection) : null;
  const list = listItem?.getParent();

  if (
    $isListItemNode(listItem) &&
    $isListNode(list) &&
    list.getListType() === LIST_FORMAT_TO_TYPE[format]
  ) {
    unwrapListItemToBlocks(listItem);
    return;
  }

  $insertList(LIST_FORMAT_TO_TYPE[format]);
}

export function toggleQuoteAtSelection(): void {
  if (isBlockFormattingDisabledAtSelection()) {
    return;
  }

  const anchorNode = getAnchorNode();
  const quote = anchorNode ? $findMatchingParent(anchorNode, $isQuoteNode) : null;

  if ($isQuoteNode(quote)) {
    unwrapQuoteToBlocks(quote);
    return;
  }

  const selection = $getSelection();
  $setBlocksType(selection, () => $createQuoteNode());
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
