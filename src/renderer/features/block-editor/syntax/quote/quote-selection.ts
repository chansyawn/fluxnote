import { $isListItemNode } from "@lexical/list";
import { $isQuoteNode, type QuoteNode } from "@lexical/rich-text";
import {
  $getNodeByKey,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

export function isInlineRuntimeNode(node: LexicalNode): boolean {
  return node.isInline() || $isTextNode(node) || $isLineBreakNode(node);
}

function isSelectionInsideListItem(node: LexicalNode): boolean {
  let current: LexicalNode | null = node;

  while (current) {
    if ($isListItemNode(current)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

export function getContainingQuote(node: LexicalNode): QuoteNode | null {
  if (isSelectionInsideListItem(node)) {
    return null;
  }

  let current: LexicalNode | null = node;

  while (current) {
    if ($isQuoteNode(current)) {
      return current;
    }
    current = current.getParent();
  }

  return null;
}

export function getSelectionAnchorNode(selection: RangeSelection): LexicalNode | null {
  return $getNodeByKey(selection.anchor.key);
}

export function getCurrentQuote(selection: RangeSelection): QuoteNode | null {
  const anchorNode = getSelectionAnchorNode(selection);
  return anchorNode ? getContainingQuote(anchorNode) : null;
}

export function getDirectQuoteChild(node: LexicalNode, quote: QuoteNode): LexicalNode | null {
  if (node.is(quote)) {
    return null;
  }

  let current: LexicalNode | null = node;
  while (current) {
    const parent: LexicalNode | null = current.getParent();
    if (parent?.is(quote)) {
      return current;
    }
    current = parent;
  }

  return null;
}

function hasNodeBeforePoint(pointNode: LexicalNode, boundary: ElementNode): boolean {
  let current: LexicalNode | null = pointNode;

  while (current && !current.is(boundary)) {
    if (current.getPreviousSiblings().some((sibling) => sibling.getTextContentSize() > 0)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

function isNodeInsideBoundary(node: LexicalNode, boundary: ElementNode): boolean {
  let current: LexicalNode | null = node;

  while (current) {
    if (current.is(boundary)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

export function isCursorAtElementStart(selection: RangeSelection, element: ElementNode): boolean {
  if (!selection.isCollapsed()) {
    return false;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode) {
    return false;
  }

  if (!isNodeInsideBoundary(anchorNode, element)) {
    return false;
  }

  return selection.anchor.offset === 0 && !hasNodeBeforePoint(anchorNode, element);
}

export function getElementParent(node: LexicalNode): ElementNode | null {
  const parent = node.getParent();
  return $isElementNode(parent) ? parent : null;
}
