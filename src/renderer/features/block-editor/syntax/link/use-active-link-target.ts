import {
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  mergeRegister,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type ActiveLink,
  isSameActiveLink,
  measureLinkFromDom,
  measureLinkFromSelection,
  refreshActiveLink,
} from "./link-model";

const CLOSE_DELAY_MS = 120;

interface LinkSources {
  hover: ActiveLink | null;
  pinned: ActiveLink | null;
  selection: ActiveLink | null;
}

type LinkSource = keyof LinkSources;
type DelayedCloseSource = "hover" | "pinned";

const EMPTY_LINK_SOURCES: LinkSources = {
  hover: null,
  pinned: null,
  selection: null,
};

function isNodeInsideElement(element: HTMLElement | null, node: EventTarget | null): boolean {
  return node instanceof Node && element?.contains(node) === true;
}

export function isElementFocusedWithin(element: HTMLElement | null): boolean {
  if (!element) return false;
  const activeElement = element.ownerDocument.activeElement;
  return activeElement !== null && element.contains(activeElement);
}

function resolveActiveLink(sources: LinkSources): ActiveLink | null {
  return sources.hover ?? sources.pinned ?? sources.selection;
}

function setLinkSource(
  sources: LinkSources,
  source: LinkSource,
  next: ActiveLink | null,
): LinkSources {
  return isSameActiveLink(sources[source], next) ? sources : { ...sources, [source]: next };
}

function clearLinkSources(sources: LinkSources): LinkSources {
  return resolveActiveLink(sources) === null ? sources : EMPTY_LINK_SOURCES;
}

function refreshLinkSources(
  editor: LexicalEditor,
  editorState: EditorState,
  sources: LinkSources,
): LinkSources {
  const next: LinkSources = {
    hover: refreshActiveLink(editor, sources.hover, editorState),
    pinned: refreshActiveLink(editor, sources.pinned, editorState),
    selection: sources.selection,
  };

  return Object.entries(next).every(([source, activeLink]) =>
    isSameActiveLink(sources[source as LinkSource], activeLink),
  )
    ? sources
    : next;
}

export function useActiveLinkTarget(editor: LexicalEditor) {
  const closeTimersRef = useRef<Record<DelayedCloseSource, number | null>>({
    hover: null,
    pinned: null,
  });
  const activeLinkRef = useRef<ActiveLink | null>(null);
  const editorHasFocusRef = useRef(false);
  const popoverElementRef = useRef<HTMLElement | null>(null);
  const rootElementRef = useRef<HTMLElement | null>(null);
  const [sources, setSources] = useState<LinkSources>(EMPTY_LINK_SOURCES);

  const activeLink = resolveActiveLink(sources);

  useEffect(() => {
    activeLinkRef.current = activeLink;
  }, [activeLink]);

  const clearCloseTimer = useCallback((source: DelayedCloseSource) => {
    const timer = closeTimersRef.current[source];
    if (timer === null) return;
    window.clearTimeout(timer);
    closeTimersRef.current[source] = null;
  }, []);

  const clearCloseTimers = useCallback(() => {
    clearCloseTimer("hover");
    clearCloseTimer("pinned");
  }, [clearCloseTimer]);

  const setSource = useCallback(
    (source: LinkSource, next: ActiveLink | null) =>
      setSources((current) => setLinkSource(current, source, next)),
    [],
  );

  const updateSelectionLink = useCallback(
    (editorState: EditorState) => {
      const next = editorHasFocusRef.current ? measureLinkFromSelection(editor, editorState) : null;
      setSource("selection", next);
    },
    [editor, setSource],
  );

  const closeActiveLink = useCallback(() => {
    clearCloseTimers();
    setSources(clearLinkSources);
  }, [clearCloseTimers]);

  const holdPopoverLinkOpen = useCallback(() => {
    clearCloseTimer("pinned");
    const next = activeLinkRef.current;
    if (next) setSource("pinned", next);
  }, [clearCloseTimer, setSource]);

  const scheduleSourceClose = useCallback(
    (source: DelayedCloseSource, shouldKeepOpen?: () => boolean) => {
      clearCloseTimer(source);
      closeTimersRef.current[source] = window.setTimeout(() => {
        closeTimersRef.current[source] = null;
        if (shouldKeepOpen?.()) return;
        setSource(source, null);
      }, CLOSE_DELAY_MS);
    },
    [clearCloseTimer, setSource],
  );

  const schedulePinnedLinkClose = useCallback(() => {
    scheduleSourceClose("pinned", () => isElementFocusedWithin(popoverElementRef.current));
  }, [scheduleSourceClose]);

  const pinActiveLink = useCallback(
    (next: ActiveLink) => {
      clearCloseTimers();
      setSources((current) =>
        current.hover === null && isSameActiveLink(current.pinned, next)
          ? current
          : { ...current, hover: null, pinned: next },
      );
    },
    [clearCloseTimers],
  );

  const showLinkFromDom = useCallback(
    (domNode: Node) => {
      const next = measureLinkFromDom(editor, domNode);
      if (next) {
        clearCloseTimer("hover");
        setSource("hover", next);
        return;
      }

      scheduleSourceClose("hover");
    },
    [clearCloseTimer, editor, scheduleSourceClose, setSource],
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
        scheduleSourceClose("hover");
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
  }, [editor, scheduleSourceClose, showLinkFromDom]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        setSources((current) => refreshLinkSources(editor, editorState, current));
        updateSelectionLink(editorState);
      }),
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          editorHasFocusRef.current = true;
          updateSelectionLink(editor.getEditorState());
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          editorHasFocusRef.current = false;
          setSource("hover", null);
          setSource("selection", null);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, setSource, updateSelectionLink]);

  useEffect(() => {
    return () => clearCloseTimers();
  }, [clearCloseTimers]);

  return {
    activeLink,
    closeActiveLink,
    holdActiveLinkOpen: holdPopoverLinkOpen,
    pinActiveLink,
    scheduleActiveLinkClose: schedulePinnedLinkClose,
    setPopoverElement,
    shouldIgnorePopoverClose,
  };
}
