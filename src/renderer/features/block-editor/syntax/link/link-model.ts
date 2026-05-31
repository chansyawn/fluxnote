import type { Mark, MarkType, Node as ProseMirrorNode } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

import { createLinkPopoverRequest, linkPopoverPluginKey } from "./link-popover-state";

const WORD_CHARACTER_PATTERN = /^[\p{L}\p{N}_]$/u;

export interface LinkPopoverAnchor {
  contextElement?: Element;
  getBoundingClientRect: () => DOMRect;
}

export interface ActiveMilkdownLink {
  from: number;
  href: string;
  text: string;
  to: number;
  view: EditorView;
}

interface LinkMarkRange {
  from: number;
  mark: Mark;
  text: string;
  to: number;
}

export type LinkToolbarCommandResult =
  | {
      activeLink: ActiveMilkdownLink;
      type: "created";
    }
  | {
      type: "empty";
    }
  | {
      type: "removed";
    };

export function sanitizeLinkUrlInput(url: string): string {
  return url.replace(/[\r\n]+/g, "");
}

export function isSameActiveMilkdownLink(
  current: ActiveMilkdownLink | null,
  next: ActiveMilkdownLink | null,
): boolean {
  if (current === next) return true;
  if (!current || !next) return false;

  return (
    current.view === next.view &&
    current.from === next.from &&
    current.to === next.to &&
    current.href === next.href &&
    current.text === next.text
  );
}

function getLinkMark(node: ProseMirrorNode | null | undefined, markType: MarkType): Mark | null {
  return node?.marks.find((mark) => mark.type === markType) ?? null;
}

function getMarkRangeAtPosition(
  view: EditorView,
  markType: MarkType,
  position: number,
): LinkMarkRange | null {
  const doc = view.state.doc;
  const clampedPosition = Math.max(0, Math.min(position, doc.content.size));

  for (const resolvedPosition of [
    doc.resolve(clampedPosition),
    clampedPosition > 0 ? doc.resolve(clampedPosition - 1) : null,
  ]) {
    if (!resolvedPosition) continue;

    const parent = resolvedPosition.parent;
    const parentStart = resolvedPosition.start();
    const after = parent.childAfter(resolvedPosition.parentOffset);
    const before = parent.childBefore(resolvedPosition.parentOffset);
    const matched = getLinkMark(after.node, markType)
      ? { index: after.index, mark: getLinkMark(after.node, markType), offset: after.offset }
      : { index: before.index, mark: getLinkMark(before.node, markType), offset: before.offset };

    if (!matched.mark) continue;

    let start = matched.offset;
    let end = matched.offset + (parent.child(matched.index)?.nodeSize ?? 0);

    for (let index = matched.index - 1; index >= 0; index -= 1) {
      const node = parent.child(index);
      if (!matched.mark.isInSet(node.marks)) break;
      start -= node.nodeSize;
    }

    for (let index = matched.index + 1; index < parent.childCount; index += 1) {
      const node = parent.child(index);
      if (!matched.mark.isInSet(node.marks)) break;
      end += node.nodeSize;
    }

    const from = parentStart + start;
    const to = parentStart + end;

    return {
      from,
      mark: matched.mark,
      text: doc.textBetween(from, to),
      to,
    };
  }

  return null;
}

function createRangeAnchor(view: EditorView, from: number, to: number): LinkPopoverAnchor {
  return {
    contextElement: view.dom,
    getBoundingClientRect: () => {
      return getDomRangeRect(view, from, to) ?? getCoordsRangeRect(view, from, to);
    },
  };
}

function getDomRangeRect(view: EditorView, from: number, to: number): DOMRect | null {
  try {
    const range = view.dom.ownerDocument.createRange();
    const start = view.domAtPos(from);
    const end = view.domAtPos(to);

    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);

    return unionRects(
      Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0),
    );
  } catch {
    return null;
  }
}

function getCoordsRangeRect(view: EditorView, from: number, to: number): DOMRect {
  try {
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);
    const top = Math.min(start.top, end.top);
    const bottom = Math.max(start.bottom, end.bottom);

    return new DOMRect(left, top, right - left, bottom - top);
  } catch {
    return view.dom.getBoundingClientRect();
  }
}

function unionRects(rects: DOMRectReadOnly[]): DOMRect | null {
  if (rects.length === 0) return null;

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return new DOMRect(left, top, right - left, bottom - top);
}

function createActiveLink(
  view: EditorView,
  markType: MarkType,
  position: number,
): ActiveMilkdownLink | null {
  const range = getMarkRangeAtPosition(view, markType, position);
  if (!range) return null;

  return {
    from: range.from,
    href: String(range.mark.attrs.href ?? ""),
    text: range.text,
    to: range.to,
    view,
  };
}

function isTextPositionInsideRange(from: number, to: number, range: LinkMarkRange): boolean {
  return from === range.from && to === range.to;
}

function findSelectedExactLinkRange(view: EditorView, markType: MarkType): LinkMarkRange | null {
  const { selection } = view.state;
  if (!(selection instanceof TextSelection) || selection.empty) return null;

  const range = getMarkRangeAtPosition(view, markType, selection.from);
  if (!range || !isTextPositionInsideRange(selection.from, selection.to, range)) return null;

  return range;
}

function isWordCharacter(character: string): boolean {
  return WORD_CHARACTER_PATTERN.test(character);
}

function findWordRangeAtSelection(view: EditorView): { from: number; to: number } | null {
  const { selection } = view.state;
  if (!(selection instanceof TextSelection) || !selection.empty) return null;

  const { $from } = selection;
  const nodeBefore = $from.nodeBefore;
  const nodeAfter = $from.nodeAfter;
  const parent = $from.parent;
  const parentStart = $from.start();
  const textOffset = $from.parentOffset;
  const parentText = parent.textBetween(0, parent.content.size);

  if (nodeAfter?.isText === true && isWordCharacter(nodeAfter.text?.[0] ?? "")) {
    // Continue below with parent-level text expansion.
  } else if (
    !nodeAfter &&
    nodeBefore?.isText === true &&
    isWordCharacter(nodeBefore.text?.at(-1) ?? "")
  ) {
    // Continue below with parent-level text expansion.
  } else {
    return null;
  }

  let start = textOffset;
  let end = textOffset;

  while (start > 0 && isWordCharacter(parentText[start - 1] ?? "")) {
    start -= 1;
  }

  while (end < parentText.length && isWordCharacter(parentText[end] ?? "")) {
    end += 1;
  }

  if (start === end) return null;

  return {
    from: parentStart + start,
    to: parentStart + end,
  };
}

function findLinkRangeAtEmptySelection(view: EditorView, markType: MarkType): LinkMarkRange | null {
  const { selection } = view.state;
  if (!(selection instanceof TextSelection) || !selection.empty) return null;

  return getMarkRangeAtPosition(view, markType, selection.from);
}

function getLinkTargetRange(
  view: EditorView,
  markType: MarkType,
): { from: number; to: number } | null {
  const { selection } = view.state;
  if (!(selection instanceof TextSelection)) return null;

  if (!selection.empty) {
    return {
      from: selection.from,
      to: selection.to,
    };
  }

  const linkRange = getMarkRangeAtPosition(view, markType, selection.from);
  if (linkRange) {
    return {
      from: linkRange.from,
      to: linkRange.to,
    };
  }

  return findWordRangeAtSelection(view);
}

export function runLinkToolbarCommand(
  view: EditorView,
  markType: MarkType,
): LinkToolbarCommandResult {
  const exactSelectedLink = findSelectedExactLinkRange(view, markType);
  if (exactSelectedLink) {
    view.dispatch(view.state.tr.removeMark(exactSelectedLink.from, exactSelectedLink.to, markType));
    return { type: "removed" };
  }

  const currentLink = findLinkRangeAtEmptySelection(view, markType);
  if (currentLink) {
    view.dispatch(view.state.tr.removeMark(currentLink.from, currentLink.to, markType));
    return { type: "removed" };
  }

  const targetRange = getLinkTargetRange(view, markType);
  if (!targetRange || targetRange.from === targetRange.to) {
    return { type: "empty" };
  }

  let tr = view.state.tr.removeMark(targetRange.from, targetRange.to, markType);
  view.state.doc.nodesBetween(targetRange.from, targetRange.to, (node, position) => {
    if (!node.isText || !getLinkMark(node, markType)) return;

    tr = tr.removeMark(position, position + node.nodeSize, markType);
  });
  tr = tr.addMark(targetRange.from, targetRange.to, markType.create({ href: "" }));

  tr.setSelection(TextSelection.create(tr.doc, targetRange.from, targetRange.to)).setMeta(
    linkPopoverPluginKey,
    createLinkPopoverRequest(targetRange.from, targetRange.to),
  );
  view.dispatch(tr);

  const activeLink = createActiveLink(view, markType, targetRange.from);
  return activeLink ? { activeLink, type: "created" } : { type: "empty" };
}

export function findLinkFromDomTarget(
  view: EditorView,
  markType: MarkType,
  target: EventTarget | null,
): ActiveMilkdownLink | null {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLElement>("a[href]");
  if (!anchor) return null;

  try {
    const anchorNode = anchor.firstChild ?? anchor;
    return createActiveLink(view, markType, view.posAtDOM(anchorNode, 0));
  } catch {
    return null;
  }
}

export function findLinkFromSelection(
  view: EditorView,
  markType: MarkType,
): ActiveMilkdownLink | null {
  const { selection } = view.state;
  if (!(selection instanceof TextSelection)) return null;

  return createActiveLink(view, markType, selection.from);
}

export function updateLinkHref(
  activeLink: ActiveMilkdownLink,
  href: string,
  markType: MarkType,
): ActiveMilkdownLink | null {
  const nextHref = sanitizeLinkUrlInput(href).trim();

  const { view, from, to } = activeLink;
  const tr = view.state.tr
    .removeMark(from, to, markType)
    .addMark(from, to, markType.create({ href: nextHref }));
  view.dispatch(tr);

  return createActiveLink(view, markType, from);
}

export function getActiveLinkAnchor(activeLink: ActiveMilkdownLink): LinkPopoverAnchor {
  return createRangeAnchor(activeLink.view, activeLink.from, activeLink.to);
}

export function removeLink(activeLink: ActiveMilkdownLink, markType: MarkType) {
  const { view, from, to } = activeLink;
  view.dispatch(view.state.tr.removeMark(from, to, markType));
}
