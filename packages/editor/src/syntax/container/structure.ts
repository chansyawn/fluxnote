import { $isCodeNode } from "@lexical/code";
import { $isListNode } from "@lexical/list";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

import { getSelectionAnchorNode, isInlineRuntimeNode } from "./selection";

function isTextualBlockEmpty(node: LexicalNode): boolean {
  return node.getTextContent().trim().length === 0;
}

export function isMeaningfulContainerChild(node: LexicalNode): boolean {
  if (isInlineRuntimeNode(node)) {
    return node.getTextContent().trim().length > 0;
  }

  if ($isParagraphNode(node) || $isHeadingNode(node)) {
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

export function normalizeContainerBlockChildren(container: ElementNode): boolean {
  let changed = false;
  let index = 0;

  while (index < container.getChildrenSize()) {
    const child = container.getChildAtIndex(index);
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
    container.splice(index, inlineChildren.length, [paragraph]);
    paragraph.splice(0, 0, inlineChildren);
    changed = true;
    index += 1;
  }

  return changed;
}

export function ensureContainerHasParagraph(container: ElementNode): boolean {
  const changed = normalizeContainerBlockChildren(container);
  if (container.getChildrenSize() > 0) {
    return changed;
  }

  container.splice(0, 0, [$createParagraphNode()]);
  return true;
}

export function repairCollapsedSelectionIntoContainerChild(
  container: ElementNode,
  selection: RangeSelection,
): boolean {
  if (!selection.isCollapsed()) {
    return false;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode?.is(container)) {
    return false;
  }

  ensureContainerHasParagraph(container);
  const preferredChild =
    container.getChildAtIndex(selection.anchor.offset) ??
    container.getChildAtIndex(Math.max(0, selection.anchor.offset - 1)) ??
    container.getFirstChild();

  if ($isElementNode(preferredChild)) {
    preferredChild.selectStart();
    return true;
  }

  return false;
}

export function normalizeContainerForEditing(
  container: ElementNode,
  selection: RangeSelection | null,
): boolean {
  const changed = ensureContainerHasParagraph(container);
  const selectionChanged = selection
    ? repairCollapsedSelectionIntoContainerChild(container, selection)
    : false;
  return changed || selectionChanged;
}
