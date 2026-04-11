export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isSelectionInsideRoot(selection: Selection, rootElement: HTMLElement): boolean {
  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  if (!anchorNode || !focusNode) {
    return false;
  }

  return rootElement.contains(anchorNode) && rootElement.contains(focusNode);
}

function toRelativeRect(rect: DOMRect, containerRect: DOMRect): SelectionRect {
  return {
    top: rect.top - containerRect.top,
    left: rect.left - containerRect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function mergeSelectionRects(rects: SelectionRect[]): SelectionRect[] {
  const merged: SelectionRect[] = [];

  const sortedRects = [...rects].sort((rectA, rectB) => {
    if (Math.abs(rectA.top - rectB.top) > 1) {
      return rectA.top - rectB.top;
    }

    return rectA.left - rectB.left;
  });

  for (const rect of sortedRects) {
    const previousRect = merged.at(-1);

    if (
      previousRect &&
      Math.abs(previousRect.top - rect.top) <= 2 &&
      Math.abs(previousRect.height - rect.height) <= 2 &&
      rect.left <= previousRect.left + previousRect.width + 2
    ) {
      previousRect.width = Math.max(previousRect.width, rect.left + rect.width - previousRect.left);
      previousRect.height = Math.max(previousRect.height, rect.height);
      previousRect.top = Math.min(previousRect.top, rect.top);
      continue;
    }

    merged.push({ ...rect });
  }

  return merged;
}

export function collectSelectionRects(
  rootElement: HTMLElement,
  containerElement: HTMLElement,
): SelectionRect[] {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return [];
  }

  if (!isSelectionInsideRoot(selection, rootElement)) {
    return [];
  }

  const selectionRange = selection.getRangeAt(0);
  const textNodeWalker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.textContent || node.textContent.length === 0) {
        return NodeFilter.FILTER_REJECT;
      }

      return selectionRange.intersectsNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const containerRect = containerElement.getBoundingClientRect();
  const rawRects: SelectionRect[] = [];

  while (textNodeWalker.nextNode()) {
    const textNode = textNodeWalker.currentNode as Text;
    const textLength = textNode.textContent?.length ?? 0;
    const startOffset = textNode === selectionRange.startContainer ? selectionRange.startOffset : 0;
    const endOffset =
      textNode === selectionRange.endContainer ? selectionRange.endOffset : textLength;

    if (startOffset >= endOffset) {
      continue;
    }

    const textRange = document.createRange();
    textRange.setStart(textNode, startOffset);
    textRange.setEnd(textNode, endOffset);

    for (const rect of Array.from(textRange.getClientRects())) {
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      rawRects.push(toRelativeRect(rect, containerRect));
    }
  }

  return mergeSelectionRects(rawRects);
}

export function collectTextRectsFromElement(
  element: HTMLElement,
  containerElement: HTMLElement,
): SelectionRect[] {
  const textNodeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.textContent || node.textContent.trim().length === 0) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const containerRect = containerElement.getBoundingClientRect();
  const rawRects: SelectionRect[] = [];

  while (textNodeWalker.nextNode()) {
    const textNode = textNodeWalker.currentNode as Text;
    const textLength = textNode.textContent?.length ?? 0;

    if (textLength === 0) {
      continue;
    }

    const textRange = document.createRange();
    textRange.selectNodeContents(textNode);

    for (const rect of Array.from(textRange.getClientRects())) {
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      rawRects.push(toRelativeRect(rect, containerRect));
    }
  }

  return rawRects;
}

export function areSelectionRectsEqual(
  currentRects: SelectionRect[],
  nextRects: SelectionRect[],
): boolean {
  if (currentRects.length !== nextRects.length) {
    return false;
  }

  return currentRects.every((rect, index) => {
    const nextRect = nextRects[index];

    return (
      Math.abs(rect.top - nextRect.top) < 0.5 &&
      Math.abs(rect.left - nextRect.left) < 0.5 &&
      Math.abs(rect.width - nextRect.width) < 0.5 &&
      Math.abs(rect.height - nextRect.height) < 0.5
    );
  });
}
