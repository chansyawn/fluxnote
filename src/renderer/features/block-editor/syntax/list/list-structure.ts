import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
  type ListNode,
  type ListType,
} from "@lexical/list";
import { $isQuoteNode } from "@lexical/rich-text";
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
  normalizeContainerBlockChildren,
  repairCollapsedSelectionIntoContainerChild,
} from "../container/structure";
import { unwrapQuoteAtStart } from "../quote/quote-structure";
import {
  getDirectListItemChild,
  isCursorAtElementEnd,
  isCursorAtElementStart,
  isInlineRuntimeNode,
} from "./list-selection";

/*
 * List items are block containers. Structural helpers move Lexical subtrees
 * directly so paragraphs, structured blocks, and nested lists keep their runtime
 * state instead of being rebuilt from Markdown text.
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

function getLastNestedList(item: ListItemNode, listType: ListType): ListNode | null {
  const lists = item
    .getChildren()
    .filter((child): child is ListNode => $isListNode(child) && child.getListType() === listType);

  return lists.at(-1) ?? null;
}

/*
 * Indenting appends to the previous sibling's last nested list of the same
 * type, matching Markdown nesting without disturbing earlier block children.
 */
function getOrCreateNestedList(item: ListItemNode, listType: ListType): ListNode {
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

/*
 * Lexical's list extension can leave raw inline nodes directly under a list item.
 * The editor's semantic model treats list items as block containers, so inline
 * runs are wrapped into paragraphs before shortcuts, typing or structural
 * operations.
 */
export function normalizeListItemBlockChildren(listItem: ListItemNode): boolean {
  return normalizeContainerBlockChildren(listItem);
}

export function wrapListItemInlineChildrenInParagraphs(listItem: ListItemNode): void {
  normalizeListItemBlockChildren(listItem);
}

export function ensureListItemHasParagraph(listItem: ListItemNode): boolean {
  return ensureContainerHasParagraph(listItem);
}

/*
 * Fresh Markdown-created list items can leave the collapsed cursor on the
 * ListItemNode itself. That element point is valid to Lexical, but it is not a
 * text-editing location for this editor because list items are block
 * containers. Move it into the nearest paragraph child so typing, Enter and
 * Backspace all see the same shape as imported Markdown lists.
 */
export function repairListItemSelection(
  listItem: ListItemNode,
  selection: RangeSelection,
): boolean {
  return repairCollapsedSelectionIntoContainerChild(listItem, selection);
}

/*
 * Normalize runtime list items to the editor's block-container shape:
 * - empty items receive an editable paragraph;
 * - raw inline children are wrapped into paragraphs;
 * - collapsed selection on the item moves into a child block.
 */
export function normalizeListItemForEditing(
  listItem: ListItemNode,
  selection: RangeSelection | null,
): boolean {
  const changed = ensureListItemHasParagraph(listItem);
  const selectionChanged = selection ? repairListItemSelection(listItem, selection) : false;
  return changed || selectionChanged;
}

export function isEmptyListItem(listItem: ListItemNode): boolean {
  return !listItem.getChildren().some(isMeaningfulContainerChild);
}

/*
 * Raw inline children are accepted here because callers may check the shape
 * before normalization. They represent the same user-facing state as a single
 * paragraph list item.
 */
export function isSingleParagraphListItem(listItem: ListItemNode): boolean {
  const children = listItem.getChildren();
  return (
    children.length > 0 &&
    ($isParagraphNode(children[0]) || children.every((child) => isInlineRuntimeNode(child)))
  );
}

/*
 * Structured children own their internal editing; paragraphs and raw inline
 * runtime nodes are the only simple text blocks for list keyboard commands.
 */
export function isStructuredListItemBlock(node: LexicalNode | null): boolean {
  return (
    node !== null &&
    !$isParagraphNode(node) &&
    !isInlineRuntimeNode(node) &&
    !($isElementNode(node) && $isParagraphNode(node))
  );
}

/*
 * Only the start of the first paragraph counts as the marker position. Starts
 * of quote/code/nested blocks must not unwrap the surrounding list item.
 */
export function isCursorAtListMarkerPosition(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
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

/*
 * Let structured blocks collapse themselves first so quote/code exit behavior
 * stays local to those block implementations.
 */
export function collapseStructuredBlockAtStart(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  const currentBlock = getDirectListItemChild(selection.anchor.getNode(), listItem);
  if (
    !$isElementNode(currentBlock) ||
    !isStructuredListItemBlock(currentBlock) ||
    !isCursorAtElementStart(selection, currentBlock)
  ) {
    return false;
  }

  if ($isQuoteNode(currentBlock)) {
    /*
     * Lexical's QuoteNode collapse wraps block children into a new paragraph.
     * FluxNote quotes already own block children, so unwrap them directly to
     * avoid nested paragraphs and data loss during markdown export.
     */
    return unwrapQuoteAtStart(selection, currentBlock);
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

export function hasNestedListAfterCurrentParagraph(
  selection: RangeSelection,
  listItem: ListItemNode,
): boolean {
  const currentChild = getDirectListItemChild(selection.anchor.getNode(), listItem);
  return $isParagraphNode(currentChild) && $isListNode(currentChild.getNextSibling());
}

/*
 * Alt+Enter inside a simple item inserts a sibling paragraph block within the
 * same list item and selects it for continued typing.
 */
export function insertBlockInsideListItem(selection: RangeSelection): boolean {
  const inserted = selection.insertParagraph();
  if (!$isElementNode(inserted)) {
    return false;
  }

  inserted.selectStart();
  return true;
}

/*
 * Alt+Enter in a multi-block item splits at the current block boundary:
 * content before the cursor stays put, and content after it moves into the new
 * sibling list item.
 */
export function splitListItemBlocksAtSelection(
  listItem: ListItemNode,
  selection: RangeSelection,
): boolean {
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

/*
 * Plain Enter creates the next list item from the current paragraph split,
 * moving the inserted paragraph and following blocks into that item.
 */
export function splitListItemAtSelection(
  listItem: ListItemNode,
  selection: RangeSelection,
): boolean {
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

/*
 * Tab requires a previous sibling and moves the whole selected ListItemNode
 * under that sibling's nested list, preserving all child blocks.
 */
export function indentListItemSubtree(listItem: ListItemNode): boolean {
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

/*
 * Shift+Tab promotes nested items after their parent item. Top-level items
 * unwrap into ordinary blocks, while following siblings stay nested under the
 * promoted item.
 */
export function outdentListItemSubtree(listItem: ListItemNode): boolean {
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

/*
 * Top-level outdent converts the selected item children into ordinary sibling
 * blocks and keeps any following list items in a new list after them.
 */
export function unwrapListItemToBlocks(listItem: ListItemNode): boolean {
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

/*
 * Marker Backspace with a previous sibling appends this item's blocks to that
 * sibling and selects the first moved block.
 */
export function mergeListItemIntoPreviousSibling(listItem: ListItemNode): boolean {
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
