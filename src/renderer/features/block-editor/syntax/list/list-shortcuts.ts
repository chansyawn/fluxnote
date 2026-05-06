import { $isCodeNode } from "@lexical/code";
import { $isListItemNode } from "@lexical/list";
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
  removeLeadingShortcutNode,
  type ContainerShortcutContext,
} from "../container/shortcuts";
import { getCurrentListItem } from "./list-selection";
import { wrapListItemInlineChildrenInParagraphs } from "./list-structure";

function getTransformerParent(anchorNode: TextNode): ElementNode | null {
  let parent = anchorNode.getParent();
  if ($isListItemNode(parent)) {
    /*
     * Lexical list items can temporarily hold inline children when users type
     * directly after the marker. The semantic model expects block children, so
     * normalize inline runs into a paragraph before running block transformers.
     */
    wrapListItemInlineChildrenInParagraphs(parent);
    parent = anchorNode.getParent();
  }

  if (!$isElementNode(parent) || $isCodeNode(parent)) {
    return null;
  }

  return parent;
}

function getShortcutContext(selection: RangeSelection): ContainerShortcutContext | null {
  /*
   * Markdown shortcuts should only run for a collapsed cursor at the start of a
   * text-bearing block inside a list item. This mirrors Lexical's root shortcut
   * behavior and prevents shortcuts from firing in the middle of existing text,
   * inline code, or nested structured nodes that own their own parsing rules.
   */
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode) || anchorNode.hasFormat("code")) {
    return null;
  }

  const parentNode = getTransformerParent(anchorNode);
  if (!parentNode || parentNode.getFirstChild() !== anchorNode) {
    return null;
  }

  if (!getCurrentListItem(selection)) {
    return null;
  }

  return {
    anchorNode,
    anchorOffset: selection.anchor.offset,
    parentNode,
  };
}

export function applyListContainerMarkdownShortcutAtSelection(
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
    removeLeadingShortcutNode,
  );
}

export function applyListContainerMultilineShortcutAtSelection(
  selection: RangeSelection,
  transformers: ReadonlyArray<Transformer>,
): boolean {
  return applyContainerMultilineShortcut(
    selection,
    transformers,
    getShortcutContext,
    removeLeadingShortcutNode,
  );
}
