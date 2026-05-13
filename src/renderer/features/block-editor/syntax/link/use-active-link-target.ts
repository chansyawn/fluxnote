import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  mergeRegister,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { findLinkAncestor, type LinkTarget, readLinkTarget } from "./link-operations";

const CLOSE_DELAY_MS = 120;

export interface ActiveLink {
  element: HTMLElement;
  target: LinkTarget;
}

function readLinkFromDom(editor: LexicalEditor, domNode: Node): LinkTarget | null {
  let target: LinkTarget | null = null;
  editor.getEditorState().read(
    () => {
      const lexicalNode = $getNearestNodeFromDOMNode(domNode);
      const link = findLinkAncestor(lexicalNode);
      target = link ? readLinkTarget(link) : null;
    },
    { editor },
  );
  return target;
}

function getLinkElement(editor: LexicalEditor, target: LinkTarget): HTMLElement | null {
  const element = editor.getElementByKey(target.key);
  return element instanceof HTMLElement ? element : null;
}

function measureActiveLink(editor: LexicalEditor, domNode: Node): ActiveLink | null {
  const target = readLinkFromDom(editor, domNode);
  if (!target) return null;

  const element = getLinkElement(editor, target);
  if (!element) return null;

  return {
    element,
    target,
  };
}

function readLinkFromSelection(): LinkTarget | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;

  const link = findLinkAncestor(selection.anchor.getNode());
  return link ? readLinkTarget(link) : null;
}

function measureSelectionLink(editor: LexicalEditor, editorState: EditorState): ActiveLink | null {
  let target: LinkTarget | null = null;
  editorState.read(() => {
    target = readLinkFromSelection();
  });

  if (!target) return null;

  const element = getLinkElement(editor, target);
  if (!element) return null;

  return {
    element,
    target,
  };
}

function isSameActiveLink(current: ActiveLink | null, next: ActiveLink): boolean {
  return (
    current?.element === next.element &&
    current.target.key === next.target.key &&
    current.target.kind === next.target.kind &&
    current.target.text === next.target.text &&
    current.target.url === next.target.url
  );
}

function isNodeInsideElement(element: HTMLElement | null, node: EventTarget | null): boolean {
  return node instanceof Node && element?.contains(node) === true;
}

export function useActiveLinkTarget(editor: LexicalEditor) {
  const hoverCloseTimerRef = useRef<number | null>(null);
  const popoverCloseTimerRef = useRef<number | null>(null);
  const activeLinkRef = useRef<ActiveLink | null>(null);
  const editorHasFocusRef = useRef(false);
  const popoverElementRef = useRef<HTMLElement | null>(null);
  const rootElementRef = useRef<HTMLElement | null>(null);
  const [caretLink, setCaretLink] = useState<ActiveLink | null>(null);
  const [pointerLink, setPointerLink] = useState<ActiveLink | null>(null);
  const [popoverLink, setPopoverLink] = useState<ActiveLink | null>(null);

  const activeLink = useMemo(
    () => pointerLink ?? popoverLink ?? caretLink,
    [caretLink, pointerLink, popoverLink],
  );

  useEffect(() => {
    activeLinkRef.current = activeLink;
  }, [activeLink]);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current === null) return;
    window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
  }, []);

  const clearPopoverCloseTimer = useCallback(() => {
    if (popoverCloseTimerRef.current === null) return;
    window.clearTimeout(popoverCloseTimerRef.current);
    popoverCloseTimerRef.current = null;
  }, []);

  const clearCloseTimers = useCallback(() => {
    clearHoverCloseTimer();
    clearPopoverCloseTimer();
  }, [clearHoverCloseTimer, clearPopoverCloseTimer]);

  const setNextCaretLink = useCallback((next: ActiveLink | null) => {
    setCaretLink((current) => {
      if (!next) return current === null ? current : null;
      return isSameActiveLink(current, next) ? current : next;
    });
  }, []);

  const setNextPointerLink = useCallback((next: ActiveLink | null) => {
    setPointerLink((current) => {
      if (!next) return current === null ? current : null;
      return isSameActiveLink(current, next) ? current : next;
    });
  }, []);

  const setNextPopoverLink = useCallback((next: ActiveLink | null) => {
    setPopoverLink((current) => {
      if (!next) return current === null ? current : null;
      return isSameActiveLink(current, next) ? current : next;
    });
  }, []);

  const updateCaretLink = useCallback(
    (editorState: EditorState) => {
      setNextCaretLink(
        editorHasFocusRef.current ? measureSelectionLink(editor, editorState) : null,
      );
    },
    [editor, setNextCaretLink],
  );

  const closeHoverLink = useCallback(() => {
    clearHoverCloseTimer();
    setNextPointerLink(null);
  }, [clearHoverCloseTimer, setNextPointerLink]);

  const closePopoverLink = useCallback(() => {
    clearPopoverCloseTimer();
    setNextPopoverLink(null);
  }, [clearPopoverCloseTimer, setNextPopoverLink]);

  const closeActiveLink = useCallback(() => {
    clearCloseTimers();
    setNextCaretLink(null);
    setNextPointerLink(null);
    setNextPopoverLink(null);
  }, [clearCloseTimers, setNextCaretLink, setNextPointerLink, setNextPopoverLink]);

  const scheduleHoverLinkClose = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = window.setTimeout(closeHoverLink, CLOSE_DELAY_MS);
  }, [clearHoverCloseTimer, closeHoverLink]);

  const holdPopoverLinkOpen = useCallback(() => {
    clearPopoverCloseTimer();
    const next = activeLinkRef.current;
    if (next) setNextPopoverLink(next);
  }, [clearPopoverCloseTimer, setNextPopoverLink]);

  const schedulePopoverLinkClose = useCallback(() => {
    clearPopoverCloseTimer();
    popoverCloseTimerRef.current = window.setTimeout(closePopoverLink, CLOSE_DELAY_MS);
  }, [clearPopoverCloseTimer, closePopoverLink]);

  const showLinkFromDom = useCallback(
    (domNode: Node) => {
      const next = measureActiveLink(editor, domNode);
      if (next) {
        clearHoverCloseTimer();
        setNextPointerLink(next);
        return;
      }

      scheduleHoverLinkClose();
    },
    [clearHoverCloseTimer, editor, scheduleHoverLinkClose, setNextPointerLink],
  );

  const setPopoverElement = useCallback((element: HTMLDivElement | null) => {
    popoverElementRef.current = element;
  }, []);

  const shouldIgnorePopoverClose = useCallback((event: Event): boolean => {
    const rootElement = rootElementRef.current;
    const popoverElement = popoverElementRef.current;

    if (event instanceof FocusEvent) {
      return (
        isNodeInsideElement(rootElement, event.relatedTarget) ||
        isNodeInsideElement(popoverElement, event.relatedTarget)
      );
    }

    return (
      isNodeInsideElement(rootElement, event.target) ||
      isNodeInsideElement(popoverElement, event.target)
    );
  }, []);

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      rootElementRef.current = rootElement;
      if (!rootElement) return;

      const handlePointerMove = (event: PointerEvent) => {
        if (event.target instanceof Node) showLinkFromDom(event.target);
      };
      const handleFocusIn = (event: FocusEvent) => {
        if (event.target instanceof Node) showLinkFromDom(event.target);
      };
      const handlePointerLeave = () => {
        scheduleHoverLinkClose();
      };

      rootElement.addEventListener("pointermove", handlePointerMove);
      rootElement.addEventListener("focusin", handleFocusIn);
      rootElement.addEventListener("pointerleave", handlePointerLeave);

      return () => {
        rootElementRef.current = null;
        rootElement.removeEventListener("pointermove", handlePointerMove);
        rootElement.removeEventListener("focusin", handleFocusIn);
        rootElement.removeEventListener("pointerleave", handlePointerLeave);
      };
    });
  }, [editor, scheduleHoverLinkClose, showLinkFromDom]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        updateCaretLink(editorState);
      }),
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          editorHasFocusRef.current = true;
          updateCaretLink(editor.getEditorState());
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          editorHasFocusRef.current = false;
          setNextPointerLink(null);
          setNextCaretLink(null);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, setNextCaretLink, setNextPointerLink, updateCaretLink]);

  useEffect(() => {
    return () => clearCloseTimers();
  }, [clearCloseTimers]);

  return {
    activeLink,
    closeActiveLink,
    holdActiveLinkOpen: holdPopoverLinkOpen,
    scheduleActiveLinkClose: schedulePopoverLinkClose,
    setPopoverElement,
    shouldIgnorePopoverClose,
  };
}
