import type { Ctx } from "@milkdown/kit/ctx";
import { linkSchema } from "@milkdown/kit/preset/commonmark";
import { Plugin } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { type CreateReactPluginView, usePluginViewContext } from "@prosemirror-adapter/react";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BlockEditorRuntime } from "../../core/types";
import {
  type ActiveMilkdownLink,
  findLinkFromDomTarget,
  findLinkFromSelection,
  isSameActiveMilkdownLink,
} from "./link-model";
import { LinkPopover } from "./link-popover";
import {
  linkPopoverPluginKey,
  type LinkPopoverRequest,
  type LinkPopoverPluginState,
} from "./link-popover-state";

const CLOSE_DELAY_MS = 120;

interface LinkSources {
  hover: ActiveMilkdownLink | null;
  pinned: ActiveMilkdownLink | null;
  selection: ActiveMilkdownLink | null;
}

type LinkSource = keyof LinkSources;
type DelayedCloseSource = "hover" | "pinned";

const EMPTY_LINK_SOURCES: LinkSources = {
  hover: null,
  pinned: null,
  selection: null,
};

export interface LinkPopoverPluginInput {
  pluginViewFactory: CreateReactPluginView;
  runtime: BlockEditorRuntime;
}

function resolveActiveLink(sources: LinkSources): ActiveMilkdownLink | null {
  return sources.hover ?? sources.pinned ?? sources.selection;
}

function isNodeInsideElement(element: HTMLElement | null, node: EventTarget | null): boolean {
  return node instanceof Node && element?.contains(node) === true;
}

function setLinkSource(
  sources: LinkSources,
  source: LinkSource,
  next: ActiveMilkdownLink | null,
): LinkSources {
  if (isSameActiveMilkdownLink(sources[source], next)) return sources;
  return { ...sources, [source]: next };
}

function hasDelayedClose(source: LinkSource): source is DelayedCloseSource {
  return source === "hover" || source === "pinned";
}

interface LinkPopoverPluginViewProps {
  ctx: Ctx;
  runtime: BlockEditorRuntime;
}

function LinkPopoverPluginView({ ctx, runtime }: LinkPopoverPluginViewProps) {
  const { prevState, view } = usePluginViewContext();
  const [sources, setSources] = useState<LinkSources>(EMPTY_LINK_SOURCES);
  const [focusRequest, setFocusRequest] = useState<LinkPopoverRequest | null>(null);
  const activeLink = useMemo(() => resolveActiveLink(sources), [sources]);
  const activeLinkRef = useRef<ActiveMilkdownLink | null>(activeLink);
  const closeTimersRef = useRef<Record<DelayedCloseSource, number | null>>({
    hover: null,
    pinned: null,
  });
  const popoverElementRef = useRef<HTMLElement | null>(null);

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

  const setSource = useCallback((source: LinkSource, next: ActiveMilkdownLink | null) => {
    setSources((current) => setLinkSource(current, source, next));
  }, []);

  const activateSource = useCallback(
    (source: LinkSource, next: ActiveMilkdownLink) => {
      if (hasDelayedClose(source)) clearCloseTimer(source);
      setSource(source, next);
    },
    [clearCloseTimer, setSource],
  );

  const deactivateSource = useCallback(
    (source: LinkSource) => {
      if (hasDelayedClose(source)) clearCloseTimer(source);
      setSource(source, null);
    },
    [clearCloseTimer, setSource],
  );

  const clear = useCallback(() => {
    clearCloseTimers();
    setSources(EMPTY_LINK_SOURCES);
  }, [clearCloseTimers]);

  const isPopoverFocusedWithin = useCallback((): boolean => {
    const activeElement = popoverElementRef.current?.ownerDocument.activeElement;
    return (
      activeElement !== undefined && isNodeInsideElement(popoverElementRef.current, activeElement)
    );
  }, []);

  const scheduleDeactivateSource = useCallback(
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

  const schedulePinnedClose = useCallback(() => {
    scheduleDeactivateSource("pinned", isPopoverFocusedWithin);
  }, [isPopoverFocusedWithin, scheduleDeactivateSource]);

  const holdActiveLinkOpen = useCallback(() => {
    const link = activeLinkRef.current;
    if (link) activateSource("pinned", link);
  }, [activateSource]);

  const pinActiveLink = useCallback(
    (next: ActiveMilkdownLink) => {
      clearCloseTimers();
      setSources((current) => setLinkSource(setLinkSource(current, "hover", null), "pinned", next));
    },
    [clearCloseTimers],
  );

  const shouldIgnorePopoverClose = useCallback(
    (event: Event | undefined): boolean => {
      if (!event) return false;

      if (event instanceof FocusEvent) {
        return (
          isNodeInsideElement(view.dom, event.relatedTarget) ||
          isNodeInsideElement(popoverElementRef.current, event.relatedTarget)
        );
      }

      return (
        isNodeInsideElement(view.dom, event.target) ||
        isNodeInsideElement(popoverElementRef.current, event.target)
      );
    },
    [view],
  );

  useEffect(() => {
    const nextLink = view.hasFocus() ? findLinkFromSelection(view, linkSchema.type(ctx)) : null;
    setSource("selection", nextLink);
  }, [ctx, prevState, setSource, view]);

  useEffect(() => {
    const request = linkPopoverPluginKey.getState(view.state)?.request ?? null;
    if (!request || focusRequest?.id === request.id) return;

    const nextLink = findLinkFromSelection(view, linkSchema.type(ctx));
    if (!nextLink) return;

    pinActiveLink(nextLink);
    setFocusRequest(request);
  }, [ctx, focusRequest, pinActiveLink, prevState, view]);

  useEffect(() => {
    const updateSelectionSource = () => {
      const nextLink = view.hasFocus() ? findLinkFromSelection(view, linkSchema.type(ctx)) : null;
      setSource("selection", nextLink);
    };
    const handleBlur = () => {
      deactivateSource("hover");
      deactivateSource("selection");
    };
    const handleFocus = () => {
      updateSelectionSource();
    };
    const handleMouseLeave = () => {
      scheduleDeactivateSource("hover");
    };
    const handleMouseMove = (event: MouseEvent) => {
      const nextLink = findLinkFromDomTarget(view, linkSchema.type(ctx), event.target);
      if (!nextLink) {
        scheduleDeactivateSource("hover");
        return;
      }

      activateSource("hover", nextLink);
    };

    updateSelectionSource();
    view.dom.addEventListener("blur", handleBlur, true);
    view.dom.addEventListener("focus", handleFocus, true);
    view.dom.addEventListener("mouseleave", handleMouseLeave);
    view.dom.addEventListener("mousemove", handleMouseMove);

    return () => {
      view.dom.removeEventListener("blur", handleBlur, true);
      view.dom.removeEventListener("focus", handleFocus, true);
      view.dom.removeEventListener("mouseleave", handleMouseLeave);
      view.dom.removeEventListener("mousemove", handleMouseMove);
    };
  }, [activateSource, ctx, deactivateSource, scheduleDeactivateSource, setSource, view]);

  useEffect(() => {
    return () => {
      clearCloseTimers();
    };
  }, [clearCloseTimers]);

  return createElement(LinkPopover, {
    activeLink,
    runtime,
    onClose: clear,
    onHoldOpen: holdActiveLinkOpen,
    onPinActiveLink: pinActiveLink,
    onScheduleClose: schedulePinnedClose,
    focusRequestId: focusRequest?.id ?? null,
    setPopoverElement: (element) => {
      popoverElementRef.current = element;
    },
    shouldIgnoreClose: shouldIgnorePopoverClose,
  });
}

export function createLinkPopoverPlugin({ pluginViewFactory, runtime }: LinkPopoverPluginInput) {
  return $prose(
    (ctx) =>
      new Plugin({
        key: linkPopoverPluginKey,
        state: {
          init: (): LinkPopoverPluginState => ({ request: null }),
          apply: (transaction, pluginState): LinkPopoverPluginState => {
            const request = transaction.getMeta(linkPopoverPluginKey) as
              | LinkPopoverRequest
              | undefined;

            return request ? { request } : pluginState;
          },
        },
        view: pluginViewFactory({
          component: function LinkPopoverPluginViewComponent() {
            return createElement(LinkPopoverPluginView, { ctx, runtime });
          },
        }),
      }),
  );
}
