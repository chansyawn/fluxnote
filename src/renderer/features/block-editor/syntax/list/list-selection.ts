import { $isListItemNode, type ListItemNode } from "@lexical/list";
import {
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

/*
 * Selection helpers translate Lexical's point/range model into list-container
 * concepts. Keyboard commands should reason about ListItemNode subtrees and
 * direct block children, not visual lines or Markdown text prefixes.
 */

export function isInlineRuntimeNode(node: LexicalNode): boolean {
  return node.isInline() || $isTextNode(node) || $isLineBreakNode(node);
}

export function getContainingListItem(node: LexicalNode): ListItemNode | null {
  /*
   * The cursor can be inside deeply nested text, quote or code nodes. Walking
   * parents gives the structural list item that owns the current edit.
   */
  let current: LexicalNode | null = node;

  while (current) {
    if ($isListItemNode(current)) {
      return current;
    }
    current = current.getParent();
  }

  return null;
}

function isListItemAncestor(ancestor: ListItemNode, item: ListItemNode): boolean {
  let current = item.getParent();

  while (current) {
    if ($isListItemNode(current) && current.is(ancestor)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

export function normalizeSelectedListItems(items: ReadonlyArray<ListItemNode>): ListItemNode[] {
  /*
   * Multi-selection may include both a parent item and its nested descendants.
   * Keeping only the highest selected item prevents the same subtree from being
   * indented, outdented or merged more than once.
   */
  return items.filter(
    (item, index) =>
      items.findIndex((candidate) => candidate.is(item)) === index &&
      !items.some((candidate) => !candidate.is(item) && isListItemAncestor(candidate, item)),
  );
}

export function getSelectedListItems(selection: RangeSelection): ListItemNode[] {
  /*
   * Range selections can touch text nodes, block nodes and list item nodes. Each
   * touched node is mapped back to its owning list item, then normalized so bulk
   * Tab/Shift+Tab preserves relative order without duplicate subtree moves.
   */
  const items: ListItemNode[] = [];

  for (const node of selection.getNodes()) {
    const item = $isListItemNode(node) ? node : getContainingListItem(node);
    if (item && !items.some((candidate) => candidate.is(item))) {
      items.push(item);
    }
  }

  if (items.length === 0) {
    const item = getContainingListItem(selection.anchor.getNode());
    if (item) {
      items.push(item);
    }
  }

  return normalizeSelectedListItems(items);
}

export function getCurrentListItem(selection: RangeSelection): ListItemNode | null {
  return getContainingListItem(selection.anchor.getNode());
}

export function getDirectListItemChild(
  node: LexicalNode,
  listItem: ListItemNode,
): LexicalNode | null {
  /*
   * A list item can contain paragraph, heading, quote, code, nested list and
   * opaque block children. Keyboard rules need the direct child to decide
   * whether the list owns the key or the child block should handle it.
   */
  if (node.is(listItem)) {
    return null;
  }

  let current: LexicalNode | null = node;
  while (current) {
    const parent: LexicalNode | null = current.getParent();
    if (parent?.is(listItem)) {
      return current;
    }
    current = parent;
  }

  return null;
}

export function getCurrentListItemBlock(
  selection: RangeSelection,
  listItem: ListItemNode,
): LexicalNode | null {
  return getDirectListItemChild(selection.anchor.getNode(), listItem);
}

function hasNodeBeforePoint(pointNode: LexicalNode, boundary: ElementNode): boolean {
  /*
   * Start/end checks must account for sibling content at every level between
   * the cursor and the boundary block. Text offsets alone are not enough for
   * nested inline nodes or formatted text spans.
   */
  let current: LexicalNode | null = pointNode;

  while (current && !current.is(boundary)) {
    const previousSiblings = current.getPreviousSiblings();
    if (previousSiblings.some((sibling) => sibling.getTextContentSize() > 0)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

function hasNodeAfterPoint(pointNode: LexicalNode, boundary: ElementNode): boolean {
  let current: LexicalNode | null = pointNode;

  while (current && !current.is(boundary)) {
    const nextSiblings = current.getNextSiblings();
    if (nextSiblings.some((sibling) => sibling.getTextContentSize() > 0)) {
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

  const { anchor } = selection;
  const anchorNode = anchor.getNode();
  if (!isNodeInsideBoundary(anchorNode, element)) {
    return false;
  }

  if (anchor.type === "text") {
    return anchor.offset === 0 && !hasNodeBeforePoint(anchorNode, element);
  }

  return anchor.offset === 0 && !hasNodeBeforePoint(anchorNode, element);
}

export function isCursorAtElementEnd(selection: RangeSelection, element: ElementNode): boolean {
  if (!selection.isCollapsed()) {
    return false;
  }

  const { anchor } = selection;
  const anchorNode = anchor.getNode();
  if (!isNodeInsideBoundary(anchorNode, element)) {
    return false;
  }

  if (anchor.type === "text") {
    return (
      anchor.offset === anchorNode.getTextContentSize() && !hasNodeAfterPoint(anchorNode, element)
    );
  }

  if (!$isElementNode(anchorNode)) {
    return false;
  }

  return anchor.offset === anchorNode.getChildrenSize() && !hasNodeAfterPoint(anchorNode, element);
}
