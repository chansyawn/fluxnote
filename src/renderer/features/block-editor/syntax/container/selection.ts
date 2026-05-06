import {
  $getNodeByKey,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

export function isInlineRuntimeNode(node: LexicalNode): boolean {
  return node.isInline() || $isTextNode(node) || $isLineBreakNode(node);
}

export function getSelectionAnchorNode(selection: RangeSelection): LexicalNode | null {
  return $getNodeByKey(selection.anchor.key);
}

export function getNearestAncestor<TNode extends LexicalNode>(
  node: LexicalNode,
  isMatch: (candidate: LexicalNode) => candidate is TNode,
): TNode | null {
  let current: LexicalNode | null = node;

  while (current) {
    if (isMatch(current)) {
      return current;
    }
    current = current.getParent();
  }

  return null;
}

export function hasAncestor(
  node: LexicalNode,
  isMatch: (candidate: LexicalNode) => boolean,
): boolean {
  let current: LexicalNode | null = node;

  while (current) {
    if (isMatch(current)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

export function getDirectContainerChild(
  node: LexicalNode,
  container: LexicalNode,
): LexicalNode | null {
  if (node.is(container)) {
    return null;
  }

  let current: LexicalNode | null = node;
  while (current) {
    const parent: LexicalNode | null = current.getParent();
    if (parent?.is(container)) {
      return current;
    }
    current = parent;
  }

  return null;
}

export function getElementParent(node: LexicalNode): ElementNode | null {
  const parent = node.getParent();
  return $isElementNode(parent) ? parent : null;
}

function hasNodeBeforePoint(pointNode: LexicalNode, boundary: ElementNode): boolean {
  let current: LexicalNode | null = pointNode;

  while (current && !current.is(boundary)) {
    const previousSiblings = current.getPreviousSiblings();
    if (previousSiblings.some((sibling) => sibling.getTextContentSize() > 0)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

function hasNodeAfterPoint(pointNode: LexicalNode, boundary: ElementNode): boolean {
  let current: LexicalNode | null = pointNode;

  while (current && !current.is(boundary)) {
    const nextSiblings = current.getNextSiblings();
    if (nextSiblings.some((sibling) => sibling.getTextContentSize() > 0)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

function isNodeInsideBoundary(node: LexicalNode, boundary: ElementNode): boolean {
  let current: LexicalNode | null = node;

  while (current) {
    if (current.is(boundary)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

export function isCursorAtElementStart(selection: RangeSelection, element: ElementNode): boolean {
  if (!selection.isCollapsed()) {
    return false;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode || !isNodeInsideBoundary(anchorNode, element)) {
    return false;
  }

  return selection.anchor.offset === 0 && !hasNodeBeforePoint(anchorNode, element);
}

export function isCursorAtElementEnd(selection: RangeSelection, element: ElementNode): boolean {
  if (!selection.isCollapsed()) {
    return false;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!anchorNode || !isNodeInsideBoundary(anchorNode, element)) {
    return false;
  }

  if (selection.anchor.type === "text") {
    return (
      selection.anchor.offset === anchorNode.getTextContentSize() &&
      !hasNodeAfterPoint(anchorNode, element)
    );
  }

  if (!$isElementNode(anchorNode)) {
    return false;
  }

  return (
    selection.anchor.offset === anchorNode.getChildrenSize() &&
    !hasNodeAfterPoint(anchorNode, element)
  );
}
