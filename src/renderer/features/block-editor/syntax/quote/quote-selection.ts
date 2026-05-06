import { $isListItemNode } from "@lexical/list";
import { $isQuoteNode, type QuoteNode } from "@lexical/rich-text";
import type { LexicalNode, RangeSelection } from "lexical";

import {
  getDirectContainerChild,
  getElementParent,
  getNearestAncestor,
  getSelectionAnchorNode,
  hasAncestor,
  isCursorAtElementStart,
  isInlineRuntimeNode,
} from "../container/selection";

export { getElementParent, getSelectionAnchorNode, isCursorAtElementStart, isInlineRuntimeNode };

function isSelectionInsideListItem(node: LexicalNode): boolean {
  return hasAncestor(node, $isListItemNode);
}

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

export function getDirectQuoteChild(node: LexicalNode, quote: QuoteNode): LexicalNode | null {
  return getDirectContainerChild(node, quote);
}
