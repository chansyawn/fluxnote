import { $isCodeNode } from "@lexical/code";
import type { Transformer } from "@lexical/markdown";
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  type RangeSelection,
  type TextNode,
} from "lexical";

import {
  applyContainerMarkdownShortcut,
  applyContainerMultilineShortcut,
  selectStartAfterContainerTransform,
  type ContainerShortcutContext,
} from "../container/shortcuts";
import { getContainingQuote, getElementParent, getSelectionAnchorNode } from "./quote-selection";
import { normalizeQuoteBlockChildren } from "./quote-structure";

function getTransformerParent(anchorNode: TextNode): ElementNode | null {
  const quote = getContainingQuote(anchorNode);
  if (!quote) {
    return null;
  }

  normalizeQuoteBlockChildren(quote);
  const parent = getElementParent(anchorNode);
  if (!$isElementNode(parent) || $isCodeNode(parent)) {
    return null;
  }

  return parent;
}

function getShortcutContext(selection: RangeSelection): ContainerShortcutContext | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!$isTextNode(anchorNode) || anchorNode.hasFormat("code")) {
    return null;
  }

  const parentNode = getTransformerParent(anchorNode);
  if (!parentNode || parentNode.getFirstChild() !== anchorNode) {
    return null;
  }

  return {
    anchorNode,
    anchorOffset: selection.anchor.offset,
    parentNode,
  };
}

export function applyQuoteContainerMarkdownShortcutAtSelection(
  transformers: ReadonlyArray<Transformer>,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  return applyContainerMarkdownShortcut(
    selection,
    transformers,
    getShortcutContext,
    selectStartAfterContainerTransform,
  );
}

export function applyQuoteContainerMultilineShortcutAtSelection(
  selection: RangeSelection,
  transformers: ReadonlyArray<Transformer>,
): boolean {
  return applyContainerMultilineShortcut(
    selection,
    transformers,
    getShortcutContext,
    selectStartAfterContainerTransform,
  );
}
