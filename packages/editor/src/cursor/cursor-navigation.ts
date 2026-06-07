import { $isHorizontalRuleNode } from "@lexical/extension";
import {
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type PointType,
  type RangeSelection,
} from "lexical";

import { $selectThematicBreak } from "../syntax/thematic-break/thematic-break-commands";
import { $isGapBoundaryNode, $isGapCursorContainer } from "./cursor-normalize";
import { $isGapCursorParagraph } from "./cursor-state";

type Direction = "backward" | "forward";

export function $getDirectGapCursorContainerChild(node: LexicalNode): LexicalNode | null {
  let current: LexicalNode | null = node;

  while (current) {
    const parent: LexicalNode | null = current.getParent();
    if ($isGapCursorContainer(parent)) {
      return current;
    }
    current = parent;
  }

  return null;
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

function $isGapAdjacentBlock(node: LexicalNode | null | undefined): boolean {
  return $isGapBoundaryNode(node) || ($isParagraphNode(node) && !$isGapCursorParagraph(node));
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
  if (!$isGapAdjacentBlock(block)) {
    return false;
  }

  if ($selectThematicBreak(block)) {
    return true;
  }

  if (direction === "backward") {
    block?.selectEnd();
  } else {
    block?.selectStart();
  }
  return true;
}

function $selectBoundaryBlock(
  block: LexicalNode | null | undefined,
  direction: Direction,
): boolean {
  if (!block || !$isGapBoundaryNode(block)) {
    return false;
  }

  if ($selectThematicBreak(block)) {
    return true;
  }

  if (direction === "backward") {
    block.selectEnd();
  } else {
    block.selectStart();
  }
  return true;
}

function $selectAdjacentThematicBreak(
  selection: RangeSelection,
  block: LexicalNode,
  direction: Direction,
): boolean {
  if (!$isAtBoundaryEdge(selection, block, direction)) {
    return false;
  }

  const sibling = direction === "backward" ? block.getPreviousSibling() : block.getNextSibling();
  return $selectThematicBreak(sibling);
}

function $getAdjacentSiblingPastGap(node: LexicalNode, direction: Direction): LexicalNode | null {
  const sibling = direction === "backward" ? node.getPreviousSibling() : node.getNextSibling();
  if (!$isGapCursorParagraph(sibling)) {
    return sibling;
  }

  return direction === "backward" ? sibling.getPreviousSibling() : sibling.getNextSibling();
}

export function $moveGapCursorSelection(direction: Direction): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const block = $getDirectGapCursorContainerChild(selection.anchor.getNode());
  if (!block) {
    return false;
  }

  if ($isGapCursorParagraph(block)) {
    return $selectAdjacentBlockFromGap(block, direction);
  }

  if ($selectAdjacentThematicBreak(selection, block, direction)) {
    return true;
  }

  if (!$isGapAdjacentBlock(block) || !$isAtBoundaryEdge(selection, block, direction)) {
    return false;
  }

  return $selectGapNearBlock(block, direction);
}

export function $selectAdjacentBoundaryFromSelection(direction: Direction): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const block = $getDirectGapCursorContainerChild(selection.anchor.getNode());
  if (!block) {
    return false;
  }

  if (!$isGapCursorParagraph(block) && !$isAtBoundaryEdge(selection, block, direction)) {
    return false;
  }

  return $selectBoundaryBlock($getAdjacentSiblingPastGap(block, direction), direction);
}

export function $deleteEmptyParagraphAfterBoundaryGapFromSelection(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const block = $getDirectGapCursorContainerChild(selection.anchor.getNode());
  if (!block || !$isParagraphNode(block)) {
    return false;
  }

  const isGapParagraph: boolean = $isGapCursorParagraph(block);
  if (
    isGapParagraph ||
    block.getTextContentSize() > 0 ||
    !$isAtBoundaryEdge(selection, block, "backward")
  ) {
    return false;
  }

  const gap = block.getPreviousSibling();
  const boundary = gap?.getPreviousSibling();
  if (
    !$isGapCursorParagraph(gap) ||
    !$isGapBoundaryNode(boundary) ||
    $isHorizontalRuleNode(boundary)
  ) {
    return false;
  }

  gap.selectStart();
  block.remove();
  return true;
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

  return $isGapCursorParagraph($getDirectGapCursorContainerChild(anchorNode));
}

export function $getSelectionGapCursorKey(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const block = $getDirectGapCursorContainerChild(selection.anchor.getNode());
  return $isGapCursorParagraph(block) ? block.getKey() : null;
}
