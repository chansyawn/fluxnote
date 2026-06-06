import { $createQuoteNode, type QuoteNode } from "@lexical/rich-text";
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
  isCursorAtElementEnd,
  isCursorAtElementStart,
} from "./quote-selection";

/*
 * Quotes are block containers. Structural helpers move Lexical child blocks
 * directly so paragraphs, lists, code blocks, and nested quotes keep their
 * runtime state instead of being rebuilt from Markdown text.
 */

/*
 * Ensure every quote has an editable block child before shortcuts, typing, or
 * structural operations inspect its contents.
 */
export function normalizeQuoteBlockChildren(quote: QuoteNode): boolean {
  return ensureContainerHasParagraph(quote);
}

/*
 * Normalize runtime quotes to the editor's block-container shape:
 * - empty quotes receive an editable paragraph;
 * - raw inline children are wrapped into paragraphs;
 * - collapsed selection on the quote moves into a child block.
 */
export function normalizeQuoteForEditing(
  quote: QuoteNode,
  selection: RangeSelection | null,
): boolean {
  return normalizeContainerForEditing(quote, selection);
}

export function isEmptyQuote(quote: QuoteNode): boolean {
  return !quote.getChildren().some(isMeaningfulContainerChild);
}

/*
 * A quote exit paragraph is the empty final paragraph inside the quote. Enter on
 * that paragraph exits the quote instead of inserting another quoted line.
 */
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

/*
 * Enter on an empty final quote paragraph creates an ordinary paragraph after
 * the quote, or replaces an otherwise empty quote with that paragraph.
 */
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

function createQuoteSibling(quote: QuoteNode): QuoteNode {
  const sibling = $createQuoteNode();
  sibling.setDirection(quote.getDirection());
  sibling.setFormat(quote.getFormatType());
  sibling.setIndent(quote.getIndent());
  sibling.setStyle(quote.getStyle());
  return sibling;
}

function insertParagraphBeforeQuote(quote: QuoteNode): boolean {
  const parent = quote.getParent();
  if (!$isElementNode(parent)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  quote.insertBefore(paragraph);
  paragraph.selectStart();
  return true;
}

function insertParagraphAfterQuote(quote: QuoteNode): boolean {
  const parent = quote.getParent();
  if (!$isElementNode(parent)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  quote.insertAfter(paragraph);
  paragraph.selectStart();
  return true;
}

function splitQuoteAtSelection(quote: QuoteNode, selection: RangeSelection): boolean {
  const inserted = selection.insertParagraph();
  const insertedParent = inserted?.getParent();
  if (!$isElementNode(inserted) || !insertedParent?.is(quote)) {
    return false;
  }

  const movedChildren = [inserted, ...inserted.getNextSiblings()];
  const sibling = createQuoteSibling(quote);
  sibling.splice(0, 0, movedChildren);
  quote.insertAfter(sibling);
  sibling.selectStart();
  return true;
}

export function applyAltEnterAtQuoteSelection(
  quote: QuoteNode,
  selection: RangeSelection,
): boolean {
  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode) {
    return false;
  }

  const currentChild = getDirectQuoteChild(anchorNode, quote);
  if (!$isParagraphNode(currentChild)) {
    return false;
  }

  if (currentChild.is(quote.getLastChild()) && isCursorAtElementEnd(selection, currentChild)) {
    return insertParagraphAfterQuote(quote);
  }

  if (currentChild.is(quote.getFirstChild()) && isCursorAtElementStart(selection, currentChild)) {
    return insertParagraphBeforeQuote(quote);
  }

  return splitQuoteAtSelection(quote, selection);
}

/*
 * Unwrapping converts quote children into ordinary sibling blocks. Root-level
 * quotes insert blocks before removal; nested quotes insert after the container.
 */
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

/*
 * Backspace unwraps a quote only from the start of its first direct child. Other
 * quote positions stay owned by the active child block.
 */
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

/*
 * Structured quote children collapse themselves first so nested list/code/quote
 * exit behavior stays local to those block implementations.
 */
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
