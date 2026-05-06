import type { QuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  $isRootOrShadowRoot,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

import {
  ensureContainerHasParagraph,
  isMeaningfulContainerChild,
  normalizeContainerForEditing,
} from "../container/structure";
import {
  getDirectQuoteChild,
  getSelectionAnchorNode,
  isCursorAtElementStart,
} from "./quote-selection";

export function normalizeQuoteBlockChildren(quote: QuoteNode): boolean {
  return ensureContainerHasParagraph(quote);
}

export function normalizeQuoteForEditing(
  quote: QuoteNode,
  selection: RangeSelection | null,
): boolean {
  return normalizeContainerForEditing(quote, selection);
}

export function isEmptyQuote(quote: QuoteNode): boolean {
  return !quote.getChildren().some(isMeaningfulContainerChild);
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
