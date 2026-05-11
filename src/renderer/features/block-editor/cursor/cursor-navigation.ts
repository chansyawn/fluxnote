import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type PointType,
  type RangeSelection,
} from "lexical";

import { $isGapBoundaryNode } from "./cursor-normalize";
import { $isGapCursorParagraph } from "./cursor-state";

type Direction = "backward" | "forward";

function $getTopLevelNode(node: LexicalNode): LexicalNode | null {
  try {
    return node.getTopLevelElementOrThrow();
  } catch {
    return null;
  }
}

function $getPointOffsetWithinBoundary(point: PointType, boundary: LexicalNode): number | null {
  const node = point.getNode();
  if (!node.isAttached()) {
    return null;
  }

  let offset =
    point.type === "text"
      ? point.offset
      : $isElementNode(node)
        ? node
            .getChildren()
            .slice(0, point.offset)
            .reduce((sum, child) => sum + child.getTextContentSize(), 0)
        : 0;
  let current: LexicalNode | null = node;

  while (current && !current.is(boundary)) {
    for (const sibling of current.getPreviousSiblings()) {
      offset += sibling.getTextContentSize();
    }
    current = current.getParent();
  }

  return current?.is(boundary) === true ? offset : null;
}

function $isAtBoundaryEdge(
  selection: RangeSelection,
  boundary: LexicalNode,
  edge: Direction,
): boolean {
  const offset = $getPointOffsetWithinBoundary(selection.anchor, boundary);
  if (offset === null) {
    return false;
  }

  return edge === "backward" ? offset === 0 : offset === boundary.getTextContentSize();
}

function $selectGapNearBlock(block: LexicalNode, direction: Direction): boolean {
  const gap = direction === "backward" ? block.getPreviousSibling() : block.getNextSibling();
  if (!$isGapCursorParagraph(gap)) {
    return false;
  }

  gap.selectStart();
  return true;
}

function $selectAdjacentBlockFromGap(gap: ElementNode, direction: Direction): boolean {
  const block = direction === "backward" ? gap.getPreviousSibling() : gap.getNextSibling();
  if (!$isGapBoundaryNode(block)) {
    return false;
  }

  if (direction === "backward") {
    block?.selectEnd();
  } else {
    block?.selectStart();
  }
  return true;
}

export function $moveGapCursorSelection(direction: Direction): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const topLevelNode = $getTopLevelNode(selection.anchor.getNode());
  if (!topLevelNode) {
    return false;
  }

  if ($isGapCursorParagraph(topLevelNode)) {
    return $selectAdjacentBlockFromGap(topLevelNode, direction);
  }

  if (!$isGapBoundaryNode(topLevelNode) || !$isAtBoundaryEdge(selection, topLevelNode, direction)) {
    return false;
  }

  return $selectGapNearBlock(topLevelNode, direction);
}

export function $isSelectionInsideGapCursor(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const anchorNode = selection.anchor.getNode();
  if ($isGapCursorParagraph(anchorNode)) {
    return true;
  }

  if ($isTextNode(anchorNode)) {
    return $isGapCursorParagraph(anchorNode.getParent());
  }

  const topLevelNode = $getTopLevelNode(anchorNode);
  return $isGapCursorParagraph(topLevelNode);
}

export function $getSelectionGapCursorKey(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const topLevelNode = $getTopLevelNode(selection.anchor.getNode());
  return $isGapCursorParagraph(topLevelNode) ? topLevelNode.getKey() : null;
}
