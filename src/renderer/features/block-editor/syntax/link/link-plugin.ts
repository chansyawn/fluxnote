import type { Ctx } from "@milkdown/kit/ctx";
import { linkSchema } from "@milkdown/kit/preset/commonmark";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

import {
  type ActiveMilkdownLink,
  findLinkFromDomTarget,
  findLinkFromSelection,
  isSameActiveMilkdownLink,
} from "./link-model";

const CLOSE_DELAY_MS = 120;
const linkPopoverPluginKey = new PluginKey("FLUXNOTES_LINK_POPOVER");

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

function resolveActiveLink(sources: LinkSources): ActiveMilkdownLink | null {
  return sources.hover ?? sources.pinned ?? sources.selection;
}

function isNodeInsideElement(element: HTMLElement | null, node: EventTarget | null): boolean {
  return node instanceof Node && element?.contains(node) === true;
}

export class LinkPopoverStateStore {
  #activeLink: ActiveMilkdownLink | null = null;
  #closeTimers: Record<DelayedCloseSource, number | null> = { hover: null, pinned: null };
  #listeners = new Set<() => void>();
  #popoverElement: HTMLElement | null = null;
  #rootElement: HTMLElement | null = null;
  #sources: LinkSources = EMPTY_LINK_SOURCES;

  getSnapshot = () => this.#activeLink;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  setRootElement = (element: HTMLElement | null) => {
    this.#rootElement = element;
  };

  setPopoverElement = (element: HTMLElement | null) => {
    this.#popoverElement = element;
  };

  setSource = (source: LinkSource, next: ActiveMilkdownLink | null) => {
    if (isSameActiveMilkdownLink(this.#sources[source], next)) return;
    this.#sources = { ...this.#sources, [source]: next };
    this.#publishResolvedLink();
  };

  clear = () => {
    this.#clearCloseTimers();
    this.#sources = EMPTY_LINK_SOURCES;
    this.#publishResolvedLink();
  };

  holdActiveLinkOpen = () => {
    this.#clearCloseTimer("pinned");
    if (this.#activeLink) this.setSource("pinned", this.#activeLink);
  };

  pinActiveLink = (next: ActiveMilkdownLink) => {
    this.#clearCloseTimers();
    this.#sources = { ...this.#sources, hover: null, pinned: next };
    this.#publishResolvedLink();
  };

  scheduleSourceClose = (source: DelayedCloseSource, shouldKeepOpen?: () => boolean) => {
    this.#clearCloseTimer(source);
    this.#closeTimers[source] = window.setTimeout(() => {
      this.#closeTimers[source] = null;
      if (shouldKeepOpen?.()) return;
      this.setSource(source, null);
    }, CLOSE_DELAY_MS);
  };

  schedulePinnedClose = () => {
    this.scheduleSourceClose("pinned", () => this.#isPopoverFocusedWithin());
  };

  shouldIgnorePopoverClose = (event: Event | undefined): boolean => {
    if (!event) return false;

    if (event instanceof FocusEvent) {
      return (
        isNodeInsideElement(this.#rootElement, event.relatedTarget) ||
        isNodeInsideElement(this.#popoverElement, event.relatedTarget)
      );
    }

    return (
      isNodeInsideElement(this.#rootElement, event.target) ||
      isNodeInsideElement(this.#popoverElement, event.target)
    );
  };

  destroy = () => {
    this.#clearCloseTimers();
    this.#listeners.clear();
    this.#activeLink = null;
    this.#sources = EMPTY_LINK_SOURCES;
    this.#popoverElement = null;
    this.#rootElement = null;
  };

  #publishResolvedLink() {
    const next = resolveActiveLink(this.#sources);
    if (isSameActiveMilkdownLink(this.#activeLink, next)) return;

    this.#activeLink = next;
    for (const listener of this.#listeners) listener();
  }

  #clearCloseTimer(source: DelayedCloseSource) {
    const timer = this.#closeTimers[source];
    if (timer === null) return;

    window.clearTimeout(timer);
    this.#closeTimers[source] = null;
  }

  #clearCloseTimers() {
    this.#clearCloseTimer("hover");
    this.#clearCloseTimer("pinned");
  }

  #isPopoverFocusedWithin(): boolean {
    const activeElement = this.#popoverElement?.ownerDocument.activeElement;
    return activeElement !== undefined && isNodeInsideElement(this.#popoverElement, activeElement);
  }
}

function updateSelectionSource(ctx: Ctx, view: EditorView, store: LinkPopoverStateStore): void {
  store.setSource(
    "selection",
    view.hasFocus() ? findLinkFromSelection(view, linkSchema.type(ctx)) : null,
  );
}

export function createLinkPopoverPlugin(store: LinkPopoverStateStore) {
  return $prose(
    (ctx) =>
      new Plugin({
        key: linkPopoverPluginKey,
        props: {
          handleDOMEvents: {
            blur() {
              store.setSource("hover", null);
              store.setSource("selection", null);
              return false;
            },
            focus(view) {
              updateSelectionSource(ctx, view, store);
              return false;
            },
            mouseleave() {
              store.scheduleSourceClose("hover");
              return false;
            },
            mousemove(view, event) {
              const activeLink = findLinkFromDomTarget(view, linkSchema.type(ctx), event.target);
              if (!activeLink) {
                store.scheduleSourceClose("hover");
                return false;
              }

              store.setSource("hover", activeLink);
              return false;
            },
          },
        },
        view(view) {
          store.setRootElement(view.dom);
          updateSelectionSource(ctx, view, store);

          return {
            destroy() {
              store.setRootElement(null);
              store.clear();
            },
            update(nextView) {
              updateSelectionSource(ctx, nextView, store);
            },
          };
        },
      }),
  );
}
