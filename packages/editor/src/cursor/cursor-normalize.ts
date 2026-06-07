import { $isCodeNode } from "@lexical/code";
import { $isHorizontalRuleNode } from "@lexical/extension";
import { $isListItemNode } from "@lexical/list";
import { $isQuoteNode } from "@lexical/rich-text";
import { $isTableNode } from "@lexical/table";
import {
  $getRoot,
  $isElementNode,
  type ElementNode,
  type LexicalNode,
  type NodeKey,
} from "lexical";

import { $createGapCursorParagraph, $isGapCursorParagraph } from "./cursor-state";

export function $isGapBoundaryNode(node: LexicalNode | null | undefined): boolean {
  return (
    $isCodeNode(node) || $isHorizontalRuleNode(node) || $isQuoteNode(node) || $isTableNode(node)
  );
}

export function $isGapCursorContainer(node: LexicalNode | null | undefined): node is ElementNode {
  return (
    $isElementNode(node) && (node.is($getRoot()) || $isQuoteNode(node) || $isListItemNode(node))
  );
}

function $needsGapBefore(node: LexicalNode): boolean {
  if (!$isGapCursorContainer(node.getParent()) || !$isGapBoundaryNode(node)) {
    return false;
  }

  const previous = node.getPreviousSibling();
  return !$isGapCursorParagraph(previous);
}

function $needsGapAfter(node: LexicalNode): boolean {
  if (!$isGapCursorContainer(node.getParent()) || !$isGapBoundaryNode(node)) {
    return false;
  }

  const next = node.getNextSibling();
  return !$isGapCursorParagraph(next);
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

function $isRequiredGap(node: LexicalNode): boolean {
  if (!$isGapCursorParagraph(node) || node.getTextContentSize() > 0) {
    return false;
  }

  return $hasGapBoundaryBefore(node) || $hasGapBoundaryAfter(node);
}

function $insertMissingGapCursors(container: ElementNode): void {
  for (const child of container.getChildren()) {
    if ($needsGapBefore(child)) {
      child.insertBefore($createGapCursorParagraph());
    }
    if ($needsGapAfter(child)) {
      child.insertAfter($createGapCursorParagraph());
    }
  }
}

function $removeUnneededGapCursors(container: ElementNode): Set<NodeKey> {
  const gapKeys = new Set<NodeKey>();
  for (const child of container.getChildren()) {
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

function $visitGapCursorContainers(
  node: ElementNode,
  visit: (container: ElementNode) => void,
): void {
  if ($isGapCursorContainer(node)) {
    visit(node);
  }

  for (const child of node.getChildren()) {
    if ($isElementNode(child) && !$isGapCursorParagraph(child)) {
      $visitGapCursorContainers(child, visit);
    }
  }
}

export function $normalizeGapCursors(): Set<NodeKey> {
  const containers: ElementNode[] = [];
  $visitGapCursorContainers($getRoot(), (container) => {
    containers.push(container);
  });

  for (const container of containers) {
    $insertMissingGapCursors(container);
  }

  const gapKeys = new Set<NodeKey>();
  for (const container of containers) {
    for (const key of $removeUnneededGapCursors(container)) {
      gapKeys.add(key);
    }
  }

  return gapKeys;
}

export function $getGapCursorKeys(): Set<NodeKey> {
  const gapKeys = new Set<NodeKey>();
  $visitGapCursorContainers($getRoot(), (container) => {
    for (const child of container.getChildren()) {
      if ($isGapCursorParagraph(child)) {
        gapKeys.add(child.getKey());
      }
    }
  });
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
