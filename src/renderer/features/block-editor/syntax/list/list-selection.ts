import { $isListItemNode, type ListItemNode } from "@lexical/list";
import type { LexicalNode, RangeSelection } from "lexical";

import {
  getDirectContainerChild,
  getNearestAncestor,
  getSelectionAnchorNode,
  isCursorAtElementEnd,
  isCursorAtElementStart,
  isInlineRuntimeNode,
} from "../container/selection";

/*
 * Selection helpers translate Lexical's point/range model into list-container
 * concepts. Keyboard commands should reason about ListItemNode subtrees and
 * direct block children, not visual lines or Markdown text prefixes.
 */
export { isCursorAtElementEnd, isCursorAtElementStart, isInlineRuntimeNode };

/*
 * The cursor can be inside deeply nested text, quote or code nodes. Walking
 * parents gives the structural list item that owns the current edit.
 */
export function getContainingListItem(node: LexicalNode): ListItemNode | null {
  return getNearestAncestor(node, $isListItemNode);
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

/*
 * Multi-selection may include both a parent item and its nested descendants.
 * Keeping only the highest selected item prevents the same subtree from being
 * indented, outdented or merged more than once.
 */
export function normalizeSelectedListItems(items: ReadonlyArray<ListItemNode>): ListItemNode[] {
  return items.filter(
    (item, index) =>
      items.findIndex((candidate) => candidate.is(item)) === index &&
      !items.some((candidate) => !candidate.is(item) && isListItemAncestor(candidate, item)),
  );
}

/*
 * Range selections can touch text nodes, block nodes and list item nodes. Each
 * touched node is mapped back to its owning list item, then normalized so bulk
 * Tab/Shift+Tab preserves relative order without duplicate subtree moves.
 */
export function getSelectedListItems(selection: RangeSelection): ListItemNode[] {
  const items: ListItemNode[] = [];

  for (const node of selection.getNodes()) {
    const item = $isListItemNode(node) ? node : getContainingListItem(node);
    if (item && !items.some((candidate) => candidate.is(item))) {
      items.push(item);
    }
  }

  if (items.length === 0) {
    const anchorNode = getSelectionAnchorNode(selection);
    const item = anchorNode ? getContainingListItem(anchorNode) : null;
    if (item) {
      items.push(item);
    }
  }

  return normalizeSelectedListItems(items);
}

export function getCurrentListItem(selection: RangeSelection): ListItemNode | null {
  const anchorNode = getSelectionAnchorNode(selection);
  return anchorNode ? getContainingListItem(anchorNode) : null;
}

/*
 * A list item can contain paragraph, heading, quote, code, nested list and
 * opaque block children. Keyboard rules need the direct child to decide whether
 * the list owns the key or the child block should handle it.
 */
export function getDirectListItemChild(
  node: LexicalNode,
  listItem: ListItemNode,
): LexicalNode | null {
  return getDirectContainerChild(node, listItem);
}

export function getCurrentListItemBlock(
  selection: RangeSelection,
  listItem: ListItemNode,
): LexicalNode | null {
  const anchorNode = getSelectionAnchorNode(selection);
  return anchorNode ? getDirectListItemChild(anchorNode, listItem) : null;
}
