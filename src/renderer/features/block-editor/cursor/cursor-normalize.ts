import { $isCodeNode } from "@lexical/code";
import { $isHorizontalRuleNode } from "@lexical/extension";
import { $isQuoteNode } from "@lexical/rich-text";
import { $isTableNode } from "@lexical/table";
import {
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  type LexicalNode,
  type NodeKey,
  type ParagraphNode,
} from "lexical";

import { $createGapCursorParagraph, $isGapCursorParagraph } from "./cursor-state";

export function $isGapBoundaryNode(node: LexicalNode | null | undefined): boolean {
  return (
    $isCodeNode(node) || $isHorizontalRuleNode(node) || $isQuoteNode(node) || $isTableNode(node)
  );
}

function $isOrdinaryParagraph(node: LexicalNode | null | undefined): node is ParagraphNode {
  return $isParagraphNode(node) && !$isGapCursorParagraph(node);
}

function $isRootChild(node: LexicalNode | null | undefined): boolean {
  return node?.getParent()?.is($getRoot()) === true;
}

function $needsGapBefore(node: LexicalNode): boolean {
  if (!$isRootChild(node) || !$isGapBoundaryNode(node)) {
    return false;
  }

  const previous = node.getPreviousSibling();
  return !$isOrdinaryParagraph(previous) && !$isGapCursorParagraph(previous);
}

function $needsGapAfter(node: LexicalNode): boolean {
  if (!$isRootChild(node) || !$isGapBoundaryNode(node)) {
    return false;
  }

  const next = node.getNextSibling();
  return !$isOrdinaryParagraph(next) && !$isGapCursorParagraph(next);
}

function $isEmptyGapCursor(node: LexicalNode): boolean {
  return $isGapCursorParagraph(node) && node.getTextContentSize() === 0;
}

function $hasGapBoundaryBefore(node: LexicalNode): boolean {
  return $isGapBoundaryNode(node.getPreviousSibling());
}

function $hasGapBoundaryAfter(node: LexicalNode): boolean {
  return $isGapBoundaryNode(node.getNextSibling());
}

function $hasOrdinaryParagraphBefore(node: LexicalNode): boolean {
  return $isOrdinaryParagraph(node.getPreviousSibling());
}

function $hasOrdinaryParagraphAfter(node: LexicalNode): boolean {
  return $isOrdinaryParagraph(node.getNextSibling());
}

function $isRequiredGap(node: LexicalNode): boolean {
  if (!$isGapCursorParagraph(node) || node.getTextContentSize() > 0) {
    return false;
  }

  return (
    ($hasGapBoundaryBefore(node) && !$hasOrdinaryParagraphAfter(node)) ||
    ($hasGapBoundaryAfter(node) && !$hasOrdinaryParagraphBefore(node))
  );
}

function $insertMissingRootGapCursors(): void {
  for (const child of $getRoot().getChildren()) {
    if ($needsGapBefore(child)) {
      child.insertBefore($createGapCursorParagraph());
    }
    if ($needsGapAfter(child)) {
      child.insertAfter($createGapCursorParagraph());
    }
  }
}

function $removeUnneededRootGapCursors(): Set<NodeKey> {
  const gapKeys = new Set<NodeKey>();
  for (const child of $getRoot().getChildren()) {
    if (!$isGapCursorParagraph(child)) {
      continue;
    }

    if ($isRequiredGap(child)) {
      gapKeys.add(child.getKey());
    } else if ($isElementNode(child) && $isEmptyGapCursor(child)) {
      child.remove();
    }
  }

  return gapKeys;
}

export function $normalizeRootGapCursors(): Set<NodeKey> {
  $insertMissingRootGapCursors();
  return $removeUnneededRootGapCursors();
}

export function $getRootGapCursorKeys(): Set<NodeKey> {
  const gapKeys = new Set<NodeKey>();
  for (const child of $getRoot().getChildren()) {
    if ($isGapCursorParagraph(child)) {
      gapKeys.add(child.getKey());
    }
  }
  return gapKeys;
}

interface SerializedGapCursorState {
  $?: {
    fluxnotesGapCursor?: unknown;
  };
  type: string;
}

function isSerializedGapCursorParagraph(node: SerializedGapCursorState): boolean {
  return node.type === "paragraph" && node.$?.fluxnotesGapCursor === true;
}

export function filterGapCursorNodes<T extends SerializedGapCursorState & { children?: T[] }>(
  nodes: ReadonlyArray<T>,
): T[] {
  const filtered: T[] = [];

  for (const node of nodes) {
    if (isSerializedGapCursorParagraph(node)) {
      continue;
    }

    filtered.push({
      ...node,
      ...(node.children ? { children: filterGapCursorNodes(node.children) } : {}),
    });
  }

  return filtered;
}
