import {
  $getNodeByKey,
  $getRoot,
  isDOMNode,
  stopLexicalPropagation,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from "lexical";

import { $getGapCursorKeys } from "./cursor-normalize";
import { $isGapCursorParagraph, $promoteGapCursorParagraph } from "./cursor-state";

const GAP_CURSOR_HIT_AREA_CLASS = "block-editor__gap-cursor-hit-area";
const INTERACTIVE_TARGET_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  '[contenteditable="false"]',
  "[data-table-control]",
  '[role="button"]',
  '[role="dialog"]',
  '[role="menu"]',
].join(",");

interface RectLike {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface GapCursorHitTarget {
  containerRect: RectLike;
  key: NodeKey;
  nextRect: RectLike | null;
  previousRect: RectLike | null;
}

interface GapCursorHitTestInput {
  point: {
    x: number;
    y: number;
  };
  targets: ReadonlyArray<GapCursorHitTarget>;
}

function isPointInHorizontalBounds(pointX: number, rect: RectLike): boolean {
  return pointX >= rect.left && pointX <= rect.right;
}

function resolveVerticalBounds(target: GapCursorHitTarget): { bottom: number; top: number } | null {
  if (target.previousRect && target.nextRect) {
    return {
      bottom: target.nextRect.top,
      top: target.previousRect.bottom,
    };
  }

  if (target.nextRect) {
    return {
      bottom: target.nextRect.top,
      top: target.containerRect.top,
    };
  }

  if (target.previousRect) {
    return {
      bottom: target.containerRect.bottom,
      top: target.previousRect.bottom,
    };
  }

  return null;
}

export function findGapCursorHitTarget(input: GapCursorHitTestInput): NodeKey | null {
  for (const target of input.targets) {
    if (!isPointInHorizontalBounds(input.point.x, target.containerRect)) {
      continue;
    }

    const bounds = resolveVerticalBounds(target);
    if (!bounds || bounds.bottom < bounds.top) {
      continue;
    }

    if (input.point.y >= bounds.top && input.point.y <= bounds.bottom) {
      return target.key;
    }
  }

  return null;
}

export function isInteractiveEventTarget(
  rootElement: HTMLElement,
  target: EventTarget | null,
): boolean {
  if (!isDOMNode(target) || !(target instanceof Element) || !rootElement.contains(target)) {
    return false;
  }

  return target.closest(INTERACTIVE_TARGET_SELECTOR) !== null;
}

function readGapCursorHitTargets(editor: LexicalEditor): GapCursorHitTarget[] {
  const targets: GapCursorHitTarget[] = [];

  editor.getEditorState().read(() => {
    const gapKeys = $getGapCursorKeys();
    for (const key of gapKeys) {
      const node = $getNodeByKey(key);
      if (!$isGapCursorParagraph(node)) {
        continue;
      }

      const containerRect = getNodeRect(editor, node.getParent());
      if (!containerRect) {
        continue;
      }

      targets.push({
        containerRect,
        key,
        nextRect: getNodeRect(editor, node.getNextSibling()),
        previousRect: getNodeRect(editor, node.getPreviousSibling()),
      });
    }
  });

  return targets;
}

function getNodeRect(editor: LexicalEditor, node: LexicalNode | null): DOMRect | null {
  if (!node) {
    return null;
  }

  if (node.is($getRoot())) {
    return editor.getRootElement()?.getBoundingClientRect() ?? null;
  }

  return editor.getElementByKey(node.getKey())?.getBoundingClientRect() ?? null;
}

function getGapCursorHitKey(
  editor: LexicalEditor,
  rootElement: HTMLElement,
  event: MouseEvent | PointerEvent,
): NodeKey | null {
  if (isInteractiveEventTarget(rootElement, event.target)) {
    return null;
  }

  return findGapCursorHitTarget({
    point: {
      x: event.clientX,
      y: event.clientY,
    },
    targets: readGapCursorHitTargets(editor),
  });
}

export function preventNativeSelectionForGapCursorMouseEvent(
  event: MouseEvent,
  key: NodeKey | null,
): boolean {
  if (!key || event.button !== 0) {
    return false;
  }

  event.preventDefault();
  return true;
}

export function claimGapCursorMouseEvent(event: MouseEvent, key: NodeKey | null): boolean {
  if (!preventNativeSelectionForGapCursorMouseEvent(event, key)) {
    return false;
  }

  stopLexicalPropagation(event);
  return true;
}

function selectGapCursor(editor: LexicalEditor, key: NodeKey): void {
  editor.update(
    () => {
      const gap = $getNodeByKey(key);
      if ($isGapCursorParagraph(gap)) {
        gap.selectStart();
      }
    },
    { discrete: true },
  );
}

function promoteGapCursor(editor: LexicalEditor, key: NodeKey): void {
  editor.update(
    () => {
      const gap = $getNodeByKey(key);
      if ($promoteGapCursorParagraph(gap) && $isGapCursorParagraph(gap) === false) {
        gap?.selectStart();
      }
    },
    { discrete: true },
  );
}

export function registerCursorMouseCommands(editor: LexicalEditor): () => void {
  return editor.registerRootListener((rootElement) => {
    if (!rootElement) {
      return;
    }

    const setHoverState = (enabled: boolean) => {
      rootElement.classList.toggle(GAP_CURSOR_HIT_AREA_CLASS, enabled);
    };

    const handlePointerMove = (event: PointerEvent) => {
      setHoverState(getGapCursorHitKey(editor, rootElement, event) !== null);
    };

    const handlePointerLeave = () => {
      setHoverState(false);
    };

    const handleMouseDown = (event: MouseEvent) => {
      preventNativeSelectionForGapCursorMouseEvent(
        event,
        getGapCursorHitKey(editor, rootElement, event),
      );
    };

    const handleClick = (event: MouseEvent) => {
      const key = getGapCursorHitKey(editor, rootElement, event);
      if (!key || !claimGapCursorMouseEvent(event, key)) {
        return;
      }

      selectGapCursor(editor, key);
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const key = getGapCursorHitKey(editor, rootElement, event);
      if (!key || !claimGapCursorMouseEvent(event, key)) {
        return;
      }

      promoteGapCursor(editor, key);
    };

    rootElement.addEventListener("pointermove", handlePointerMove);
    rootElement.addEventListener("pointerleave", handlePointerLeave);
    rootElement.addEventListener("mousedown", handleMouseDown, true);
    rootElement.addEventListener("click", handleClick, true);
    rootElement.addEventListener("dblclick", handleDoubleClick, true);

    return () => {
      setHoverState(false);
      rootElement.removeEventListener("pointermove", handlePointerMove);
      rootElement.removeEventListener("pointerleave", handlePointerLeave);
      rootElement.removeEventListener("mousedown", handleMouseDown, true);
      rootElement.removeEventListener("click", handleClick, true);
      rootElement.removeEventListener("dblclick", handleDoubleClick, true);
    };
  });
}
