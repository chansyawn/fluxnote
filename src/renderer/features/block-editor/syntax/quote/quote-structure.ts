import { $isCodeNode } from "@lexical/code";
import { $isListNode } from "@lexical/list";
import { $isQuoteNode, type QuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  $isRootOrShadowRoot,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

import {
  getDirectQuoteChild,
  getSelectionAnchorNode,
  isCursorAtElementStart,
  isInlineRuntimeNode,
} from "./quote-selection";

function isTextualBlockEmpty(node: LexicalNode): boolean {
  return node.getTextContent().trim().length === 0;
}

function isMeaningfulQuoteChild(node: LexicalNode): boolean {
  if (isInlineRuntimeNode(node)) {
    return node.getTextContent().trim().length > 0;
  }

  if ($isParagraphNode(node)) {
    return !isTextualBlockEmpty(node);
  }

  if ($isCodeNode(node)) {
    return node.getTextContent().length > 0;
  }

  if ($isListNode(node) || $isQuoteNode(node)) {
    return node.getChildrenSize() > 0;
  }

  return true;
}

export function normalizeQuoteBlockChildren(quote: QuoteNode): boolean {
  let changed = false;
  let index = 0;

  while (index < quote.getChildrenSize()) {
    const child = quote.getChildAtIndex(index);
    if (!child || !isInlineRuntimeNode(child)) {
      index += 1;
      continue;
    }

    const inlineChildren: LexicalNode[] = [child];
    let next = child.getNextSibling();
    while (next && isInlineRuntimeNode(next)) {
      inlineChildren.push(next);
      next = next.getNextSibling();
    }

    const paragraph = $createParagraphNode();
    quote.splice(index, inlineChildren.length, [paragraph]);
    paragraph.splice(0, 0, inlineChildren);
    changed = true;
    index += 1;
  }

  if (quote.getChildrenSize() === 0) {
    quote.splice(0, 0, [$createParagraphNode()]);
    changed = true;
  }

  return changed;
}

export function normalizeQuoteForEditing(
  quote: QuoteNode,
  selection: RangeSelection | null,
): boolean {
  const changed = normalizeQuoteBlockChildren(quote);
  if (!selection?.isCollapsed()) {
    return changed;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode?.is(quote)) {
    return changed;
  }

  const child =
    quote.getChildAtIndex(selection.anchor.offset) ??
    quote.getChildAtIndex(Math.max(0, selection.anchor.offset - 1)) ??
    quote.getFirstChild();

  if ($isElementNode(child)) {
    child.selectStart();
    return true;
  }

  return changed;
}

export function isEmptyQuote(quote: QuoteNode): boolean {
  return !quote.getChildren().some(isMeaningfulQuoteChild);
}

export function isQuoteExitParagraph(quote: QuoteNode, selection: RangeSelection): boolean {
  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode) {
    return false;
  }

  const currentChild = getDirectQuoteChild(anchorNode, quote);
  return (
    $isParagraphNode(currentChild) &&
    currentChild.is(quote.getLastChild()) &&
    currentChild.getTextContent().trim().length === 0
  );
}

export function exitQuoteAtEmptyParagraph(quote: QuoteNode, selection: RangeSelection): boolean {
  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode) {
    return false;
  }

  const currentChild = getDirectQuoteChild(anchorNode, quote);
  if (!$isParagraphNode(currentChild) || !isQuoteExitParagraph(quote, selection)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  if (isEmptyQuote(quote)) {
    quote.replace(paragraph);
  } else {
    currentChild.remove();
    quote.insertAfter(paragraph);
  }

  paragraph.selectStart();
  return true;
}

export function unwrapQuoteToBlocks(quote: QuoteNode): boolean {
  const parent = quote.getParent();
  if (!$isElementNode(parent)) {
    return false;
  }

  normalizeQuoteBlockChildren(quote);
  const blocks = quote.getChildren();
  const firstBlock = blocks[0] ?? null;

  if (blocks.length === 0) {
    const paragraph = $createParagraphNode();
    quote.replace(paragraph);
    paragraph.selectStart();
    return true;
  }

  if ($isRootOrShadowRoot(parent)) {
    let anchor: LexicalNode = quote;
    for (const block of [...blocks].reverse()) {
      anchor.insertBefore(block);
      anchor = block;
    }
  } else {
    let anchor: LexicalNode = quote;
    for (const block of blocks) {
      anchor.insertAfter(block);
      anchor = block;
    }
  }

  quote.remove();
  firstBlock?.selectStart();
  return true;
}

export function unwrapQuoteAtStart(selection: RangeSelection, quote: QuoteNode): boolean {
  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode) {
    return false;
  }

  const currentChild = getDirectQuoteChild(anchorNode, quote);
  if (!$isElementNode(currentChild) || !currentChild.is(quote.getFirstChild())) {
    return false;
  }

  if (!isCursorAtElementStart(selection, currentChild)) {
    return false;
  }

  return unwrapQuoteToBlocks(quote);
}

export function collapseQuoteChildAtStart(selection: RangeSelection, quote: QuoteNode): boolean {
  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode) {
    return false;
  }

  const currentChild = getDirectQuoteChild(anchorNode, quote);
  if (
    !$isElementNode(currentChild) ||
    $isParagraphNode(currentChild) ||
    !isCursorAtElementStart(selection, currentChild)
  ) {
    return false;
  }

  return currentChild.collapseAtStart(selection);
}
