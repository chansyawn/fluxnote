import type { Mark, MarkType, Node as ProseMirrorNode } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

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
    },
  };
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
  if (!(selection instanceof TextSelection) || !selection.empty) return null;

  return createActiveLink(view, markType, selection.from);
}

export function updateLinkHref(
  activeLink: ActiveMilkdownLink,
  href: string,
  markType: MarkType,
): ActiveMilkdownLink | null {
  const nextHref = sanitizeLinkUrlInput(href).trim();
  if (!nextHref) return activeLink;

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
