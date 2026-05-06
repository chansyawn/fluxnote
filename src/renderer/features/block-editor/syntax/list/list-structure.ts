import { $isCodeNode } from "@lexical/code";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
  type ListNode,
  type ListType,
} from "@lexical/list";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  $isRootOrShadowRoot,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

import {
  getDirectListItemChild,
  isCursorAtElementEnd,
  isCursorAtElementStart,
  isInlineRuntimeNode,
} from "./list-selection";

/*
 * This module owns structural mutations for list-item containers. Helpers move
 * Lexical nodes directly so paragraph children, structured blocks and nested
 * lists travel as one subtree; no operation reconstructs content from rendered
 * Markdown lines.
 */

function getListParent(item: ListItemNode): ListNode | null {
  const parent = item.getParent();
  return $isListNode(parent) ? parent : null;
}

function getListType(item: ListItemNode): ListType {
  return getListParent(item)?.getListType() ?? "bullet";
}

function createListItemForList(list: ListNode): ListItemNode {
  return $createListItemNode(list.getListType() === "check" ? false : undefined);
}

function createParagraphWithChildren(children: LexicalNode[]): ElementNode {
  const paragraph = $createParagraphNode();
  paragraph.splice(0, 0, children);
  return paragraph;
}

function isTextualBlockEmpty(node: LexicalNode): boolean {
  return node.getTextContent().trim().length === 0;
}

function isMeaningfulListItemChild(node: LexicalNode): boolean {
  /*
   * Empty-item detection is semantic, not visual. Empty text blocks are ignored,
   * while any non-empty structured block, nested list or opaque child keeps the
   * item from being treated as a blank marker.
   */
  if (isInlineRuntimeNode(node)) {
    return node.getTextContent().trim().length > 0;
  }

  if ($isParagraphNode(node) || $isHeadingNode(node)) {
    return !isTextualBlockEmpty(node);
  }

  if ($isCodeNode(node)) {
    return node.getTextContent().length > 0;
  }

  if ($isListNode(node)) {
    return node.getChildrenSize() > 0;
  }

  if ($isQuoteNode(node)) {
    return node.getChildrenSize() > 0;
  }

  return true;
}

function getLastNestedList(item: ListItemNode, listType: ListType): ListNode | null {
  const lists = item
    .getChildren()
    .filter((child): child is ListNode => $isListNode(child) && child.getListType() === listType);

  return lists.at(-1) ?? null;
}

function getOrCreateNestedList(item: ListItemNode, listType: ListType): ListNode {
  /*
   * Indenting appends to the last nested list of the same type under the
   * previous sibling. This mirrors Markdown nesting while preserving any
   * existing block children before that nested list.
   */
  const nested = getLastNestedList(item, listType);
  if (nested) {
    return nested;
  }

  const nextNested = $createListNode(listType, 1);
  item.splice(item.getChildrenSize(), 0, [nextNested]);
  return nextNested;
}

function removeListIfEmpty(list: ListNode): void {
  if (list.getChildrenSize() === 0) {
    list.remove();
  }
}

export function wrapListItemInlineChildrenInParagraphs(listItem: ListItemNode): void {
  /*
   * Lexical's list plugin can leave raw inline nodes directly under a list item.
   * The editor's semantic model treats list items as block containers, so inline
   * runs are wrapped into paragraphs before shortcuts or structural operations.
   */
  let index = 0;

  while (index < listItem.getChildrenSize()) {
    const child = listItem.getChildAtIndex(index);
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

    listItem.splice(index, inlineChildren.length, [createParagraphWithChildren(inlineChildren)]);
    index += 1;
  }
}

export function ensureListItemHasParagraph(listItem: ListItemNode): void {
  if (listItem.getChildrenSize() === 0) {
    listItem.splice(0, 0, [$createParagraphNode()]);
  } else {
    wrapListItemInlineChildrenInParagraphs(listItem);
  }
}

export function isEmptyListItem(listItem: ListItemNode): boolean {
  return !listItem.getChildren().some(isMeaningfulListItemChild);
}

export function isSingleParagraphListItem(listItem: ListItemNode): boolean {
  /*
   * Raw inline children are accepted here because callers may check the shape
   * before normalization. They represent the same user-facing state as a single
   * paragraph list item.
   */
  const children = listItem.getChildren();
  return (
    children.length === 1 &&
    ($isParagraphNode(children[0]) || children.every((child) => isInlineRuntimeNode(child)))
  );
}

export function isStructuredListItemBlock(node: LexicalNode | null): boolean {
  /*
   * Paragraphs and inline runtime nodes are simple text blocks for list keyboard
   * purposes. Everything else is treated as structured and keeps ownership of
   * its internal Enter/Backspace behavior unless a command explicitly splits at
   * a block boundary.
   */
  return (
    node !== null &&
    !$isParagraphNode(node) &&
    !isInlineRuntimeNode(node) &&
    !($isElementNode(node) && $isParagraphNode(node))
  );
}

export function isCursorAtListItemStart(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  const firstChild = listItem.getFirstChild();
  if (!firstChild) {
    return true;
  }

  const currentChild = getDirectListItemChild(selection.anchor.getNode(), listItem);
  if (!currentChild?.is(firstChild) || !$isElementNode(firstChild)) {
    return false;
  }

  return isCursorAtElementStart(selection, firstChild);
}

export function isCursorAtListMarkerPosition(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  /*
   * The marker position is deliberately narrower than "start of list item".
   * It only matches the start of the first paragraph child. This prevents
   * Backspace at the start of quote/code/nested blocks from accidentally
   * unwrapping the surrounding list item.
   */
  const firstChild = listItem.getFirstChild();
  if (!firstChild) {
    return true;
  }

  const currentChild = getDirectListItemChild(selection.anchor.getNode(), listItem);
  if (!currentChild?.is(firstChild) || !$isParagraphNode(currentChild)) {
    return false;
  }

  return isCursorAtElementStart(selection, currentChild);
}

export function collapseStructuredBlockAtStart(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  /*
   * Quote, code and other ElementNode-based blocks know how to collapse at their
   * own start. Calling collapseAtStart keeps block-specific exit behavior local
   * to the block and avoids duplicating quote/code rules in the list handler.
   */
  const currentBlock = getDirectListItemChild(selection.anchor.getNode(), listItem);
  if (
    !$isElementNode(currentBlock) ||
    !isStructuredListItemBlock(currentBlock) ||
    !isCursorAtElementStart(selection, currentBlock)
  ) {
    return false;
  }

  return currentBlock.collapseAtStart(selection);
}

export function isCursorAtLastParagraphEnd(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  const lastChild = listItem.getLastChild();
  if (!$isParagraphNode(lastChild)) {
    return false;
  }

  return isCursorAtElementEnd(selection, lastChild);
}

export function insertBlockInsideListItem(selection: RangeSelection): boolean {
  /*
   * Alt+Enter inside a simple item:
   *
   * - insert a paragraph block inside the current list item;
   * - let Lexical split the current paragraph at the cursor;
   * - select the new paragraph so typing continues inside the same item.
   */
  const inserted = selection.insertParagraph();
  if (!$isElementNode(inserted)) {
    return false;
  }

  inserted.selectStart();
  return true;
}

export function createSiblingListItem(listItem: ListItemNode): ListItemNode | null {
  /*
   * New sibling items inherit the parent list type, including checklist checked
   * state shape. The item starts with an empty paragraph so the semantic adapter
   * always sees a valid block child.
   */
  const list = getListParent(listItem);
  if (!list) {
    return null;
  }

  const sibling = createListItemForList(list);
  sibling.splice(0, 0, [$createParagraphNode()]);
  listItem.insertAfter(sibling);
  sibling.selectStart();
  return sibling;
}

export function splitListItemBlocksAtSelection(
  listItem: ListItemNode,
  selection: RangeSelection,
): boolean {
  /*
   * Alt+Enter in a multi-block item:
   *
   * - content before the cursor remains in the current item;
   * - content after the cursor moves into a new sibling item;
   * - when the cursor is inside a paragraph, that paragraph is split first;
   * - when the cursor is inside a structured block, the split happens after the
   *   structured block so the block can keep its own internal state intact.
   */
  const list = getListParent(listItem);
  const currentBlock = getDirectListItemChild(selection.anchor.getNode(), listItem);
  if (!list || !currentBlock) {
    return false;
  }

  let movedChildren: LexicalNode[] = [];
  if ($isParagraphNode(currentBlock)) {
    const inserted = selection.insertParagraph();
    const insertedParent = inserted?.getParent();
    if (!$isElementNode(inserted) || !insertedParent?.is(listItem)) {
      return false;
    }
    const nextSiblings = inserted.getNextSiblings();
    if (inserted.getTextContentSize() === 0 && nextSiblings.length > 0) {
      movedChildren = nextSiblings;
      inserted.remove();
    } else {
      movedChildren = [inserted, ...nextSiblings];
    }
  } else {
    movedChildren = currentBlock.getNextSiblings();
  }

  const sibling = createListItemForList(list);
  sibling.splice(0, 0, movedChildren.length > 0 ? movedChildren : [$createParagraphNode()]);
  listItem.insertAfter(sibling);
  sibling.selectStart();
  return true;
}

export function splitListItemAtSelection(
  listItem: ListItemNode,
  selection: RangeSelection,
): boolean {
  /*
   * Plain Enter list split:
   *
   * - applies to a single paragraph item;
   * - also applies to the final paragraph of a multi-block item;
   * - splits the current paragraph at the cursor;
   * - moves the new paragraph and following blocks into the new sibling item.
   */
  const list = getListParent(listItem);
  if (!list) {
    return false;
  }

  const inserted = selection.insertParagraph();
  const insertedParent = inserted?.getParent();
  if (!$isElementNode(inserted) || !insertedParent?.is(listItem)) {
    return false;
  }

  const movedChildren = [inserted, ...inserted.getNextSiblings()];
  const sibling = createListItemForList(list);
  sibling.splice(0, 0, movedChildren);
  listItem.insertAfter(sibling);
  sibling.selectStart();
  return true;
}

export function indentListItemSubtree(listItem: ListItemNode): boolean {
  /*
   * Tab indent:
   *
   * - require a previous sibling list item;
   * - move the selected ListItemNode under that sibling's nested list;
   * - keep paragraph, quote, code and nested list children attached to the moved
   *   subtree in their original order.
   */
  const list = getListParent(listItem);
  const previous = listItem.getPreviousSibling();
  if (!list || !$isListItemNode(previous)) {
    return false;
  }

  const nested = getOrCreateNestedList(previous, list.getListType());
  nested.splice(nested.getChildrenSize(), 0, [listItem]);
  removeListIfEmpty(list);
  return true;
}

export function outdentListItemSubtree(listItem: ListItemNode): boolean {
  /*
   * Shift+Tab outdent:
   *
   * - nested item: promote the item after its containing parent item;
   * - following siblings at the old level: move them under the promoted item as
   *   a nested list;
   * - top-level item: unwrap it into ordinary blocks;
   * - every path preserves child block and nested list subtrees.
   */
  const list = getListParent(listItem);
  if (!list) {
    return false;
  }

  const listParent = list.getParent();
  if ($isListItemNode(listParent)) {
    const followingSiblings = listItem.getNextSiblings();
    if (followingSiblings.length > 0) {
      const nested = getOrCreateNestedList(listItem, list.getListType());
      nested.splice(nested.getChildrenSize(), 0, followingSiblings);
    }

    listParent.insertAfter(listItem);
    removeListIfEmpty(list);
    return true;
  }

  return unwrapListItemToBlocks(listItem);
}

export function unwrapListItemToBlocks(listItem: ListItemNode): boolean {
  /*
   * Top-level Shift+Tab unwrap:
   *
   * - convert the selected list item children into ordinary sibling blocks;
   * - if following list items exist, move them into a new list after the
   *   unwrapped blocks;
   * - keep block order stable whether the item is first, middle or last.
   */
  const list = getListParent(listItem);
  const container = list?.getParent();
  if (!list || !$isElementNode(container)) {
    return false;
  }

  if (!$isRootOrShadowRoot(container) && $isListItemNode(container)) {
    return outdentListItemSubtree(listItem);
  }

  ensureListItemHasParagraph(listItem);
  const blocks = listItem.getChildren();
  const followingItems = listItem.getNextSiblings();
  const hasPreviousItems = listItem.getPreviousSibling() !== null;
  let afterList: ListNode | null = null;

  if (followingItems.length > 0) {
    afterList = $createListNode(getListType(listItem), list.getStart());
    afterList.splice(0, 0, followingItems);
    list.insertAfter(afterList);
  }

  if (hasPreviousItems) {
    let anchor: LexicalNode = list;
    for (const block of blocks) {
      anchor.insertAfter(block);
      anchor = block;
    }
  } else {
    let anchor: LexicalNode = list;
    for (const block of [...blocks].reverse()) {
      anchor.insertBefore(block);
      anchor = block;
    }
  }

  listItem.remove();
  removeListIfEmpty(list);
  blocks[0]?.selectStart();
  return true;
}

export function mergeListItemIntoPreviousSibling(listItem: ListItemNode): boolean {
  /*
   * Backspace marker merge:
   *
   * - require a previous sibling list item;
   * - append all current item block children to that previous sibling;
   * - never guess a visual insertion line;
   * - keep previous structured children, such as quotes, ahead of moved content.
   */
  const previous = listItem.getPreviousSibling();
  if (!$isListItemNode(previous)) {
    return false;
  }

  const list = getListParent(listItem);
  ensureListItemHasParagraph(previous);
  ensureListItemHasParagraph(listItem);

  const movedChildren = listItem.getChildren();
  const firstMoved = movedChildren[0] ?? null;
  previous.splice(previous.getChildrenSize(), 0, movedChildren);
  listItem.remove();
  if (list) {
    removeListIfEmpty(list);
  }
  firstMoved?.selectStart();
  return true;
}
