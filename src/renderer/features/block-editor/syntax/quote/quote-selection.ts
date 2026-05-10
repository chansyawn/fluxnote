import { $isListItemNode } from "@lexical/list";
import { $isQuoteNode, type QuoteNode } from "@lexical/rich-text";
import type { LexicalNode, RangeSelection } from "lexical";

import {
  getDirectContainerChild,
  getElementParent,
  getNearestAncestor,
  getSelectionAnchorNode,
  hasAncestor,
  isCursorAtElementEnd,
  isCursorAtElementStart,
  isInlineRuntimeNode,
} from "../container/selection";

export {
  getElementParent,
  getSelectionAnchorNode,
  isCursorAtElementEnd,
  isCursorAtElementStart,
  isInlineRuntimeNode,
};

/*
 * Selection helpers translate Lexical points into quote-container concepts.
 * Quotes nested inside list items are intentionally handled by list commands so
 * list marker behavior keeps ownership of the surrounding ListItemNode.
 */

function isSelectionInsideListItem(node: LexicalNode): boolean {
  return hasAncestor(node, $isListItemNode);
}

/*
 * Return the structural quote that owns the current edit unless that edit is
 * inside a list item, where list-level keyboard commands take precedence.
 */
export function getContainingQuote(node: LexicalNode): QuoteNode | null {
  if (isSelectionInsideListItem(node)) {
    return null;
  }

  return getNearestAncestor(node, $isQuoteNode);
}

export function getCurrentQuote(selection: RangeSelection): QuoteNode | null {
  const anchorNode = getSelectionAnchorNode(selection);
  return anchorNode ? getContainingQuote(anchorNode) : null;
}

/*
 * Quote commands reason about direct quote children, not visual Markdown lines
 * or deeply nested text nodes.
 */
export function getDirectQuoteChild(node: LexicalNode, quote: QuoteNode): LexicalNode | null {
  return getDirectContainerChild(node, quote);
}
