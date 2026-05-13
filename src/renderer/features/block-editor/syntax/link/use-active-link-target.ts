import { $getNearestNodeFromDOMNode, type LexicalEditor } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";

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

function isSameActiveLink(current: ActiveLink | null, next: ActiveLink): boolean {
  return (
    current?.element === next.element &&
    current.target.key === next.target.key &&
    current.target.kind === next.target.kind &&
    current.target.text === next.target.text &&
    current.target.url === next.target.url
  );
}

export function useActiveLinkTarget(editor: LexicalEditor) {
  const closeTimerRef = useRef<number | null>(null);
  const [activeLink, setActiveLink] = useState<ActiveLink | null>(null);

  const keepActiveLinkOpen = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closeActiveLink = useCallback(() => {
    keepActiveLinkOpen();
    setActiveLink(null);
  }, [keepActiveLinkOpen]);

  const scheduleActiveLinkClose = useCallback(() => {
    keepActiveLinkOpen();
    closeTimerRef.current = window.setTimeout(closeActiveLink, CLOSE_DELAY_MS);
  }, [closeActiveLink, keepActiveLinkOpen]);

  const showLink = useCallback(
    (domNode: Node) => {
      const next = measureActiveLink(editor, domNode);
      if (!next) {
        scheduleActiveLinkClose();
        return;
      }

      keepActiveLinkOpen();
      setActiveLink((current) => (isSameActiveLink(current, next) ? current : next));
    },
    [editor, keepActiveLinkOpen, scheduleActiveLinkClose],
  );

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) return;

      const handlePointerOver = (event: PointerEvent) => {
        if (event.target instanceof Node) showLink(event.target);
      };
      const handleFocusIn = (event: FocusEvent) => {
        if (event.target instanceof Node) showLink(event.target);
      };
      const handlePointerOut = (event: PointerEvent) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && rootElement.contains(nextTarget)) return;
        scheduleActiveLinkClose();
      };

      rootElement.addEventListener("pointerover", handlePointerOver);
      rootElement.addEventListener("focusin", handleFocusIn);
      rootElement.addEventListener("pointerout", handlePointerOut);

      return () => {
        rootElement.removeEventListener("pointerover", handlePointerOver);
        rootElement.removeEventListener("focusin", handleFocusIn);
        rootElement.removeEventListener("pointerout", handlePointerOut);
      };
    });
  }, [editor, scheduleActiveLinkClose, showLink]);

  useEffect(() => {
    return () => keepActiveLinkOpen();
  }, [keepActiveLinkOpen]);

  return {
    activeLink,
    closeActiveLink,
    keepActiveLinkOpen,
    scheduleActiveLinkClose,
  };
}
