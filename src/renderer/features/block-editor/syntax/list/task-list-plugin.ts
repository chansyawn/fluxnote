import type { Node as ProseMirrorNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

const taskListTogglePluginKey = new PluginKey("FLUXNOTES_TASK_LIST_TOGGLE");
const MARKER_SIZE_EM = 0.875;
const MARKER_OFFSET_EM = 1.25;
const MARKER_HIT_SLOP_PX = 3;

function parsePixelValue(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getLineHeightPx(element: HTMLElement, fontSizePx: number): number {
  const computed = getComputedStyle(element);
  const parsedLineHeight = parsePixelValue(computed.lineHeight);
  return parsedLineHeight ?? fontSizePx * 1.5;
}

function isTaskMarkerClick(element: HTMLElement, event: MouseEvent): boolean {
  const rect = element.getBoundingClientRect();
  const computed = getComputedStyle(element);
  const fontSizePx = parsePixelValue(computed.fontSize) ?? 16;
  const markerSizePx = MARKER_SIZE_EM * fontSizePx;
  const markerOffsetPx = MARKER_OFFSET_EM * fontSizePx;
  const lineHeightPx = getLineHeightPx(element, fontSizePx);
  const markerTop = rect.top + Math.max(0, (lineHeightPx - markerSizePx) / 2);
  const markerBottom = markerTop + markerSizePx;
  const isRtl = computed.direction === "rtl";
  const markerStart = isRtl
    ? rect.right + markerOffsetPx - markerSizePx
    : rect.left - markerOffsetPx;
  const markerEnd = markerStart + markerSizePx;

  return (
    event.clientX >= markerStart - MARKER_HIT_SLOP_PX &&
    event.clientX <= markerEnd + MARKER_HIT_SLOP_PX &&
    event.clientY >= markerTop - MARKER_HIT_SLOP_PX &&
    event.clientY <= markerBottom + MARKER_HIT_SLOP_PX
  );
}

function findTaskListItem(view: EditorView, element: HTMLElement) {
  let position;
  try {
    position = view.state.doc.resolve(view.posAtDOM(element, 0));
  } catch {
    let fallback: { node: ProseMirrorNode; position: number } | undefined;
    view.state.doc.descendants((node, nodePosition) => {
      if (
        node.type.name === "list_item" &&
        node.attrs.checked !== null &&
        view.nodeDOM(nodePosition) === element
      ) {
        fallback = { node, position: nodePosition };
        return false;
      }

      return true;
    });

    return fallback;
  }

  for (let depth = position.depth; depth > 0; depth -= 1) {
    const node = position.node(depth);
    if (node.type.name !== "list_item" || node.attrs.checked === null) continue;

    return { node, position: position.before(depth) };
  }

  return undefined;
}

function toggleTaskListItemFromMarkerClick(view: EditorView, event: MouseEvent): boolean {
  if (!(event.target instanceof Element)) return false;

  const taskElement = event.target.closest<HTMLElement>('li[data-item-type="task"]');
  if (!taskElement || !isTaskMarkerClick(taskElement, event)) return false;

  const taskListItem = findTaskListItem(view, taskElement);
  if (!taskListItem) return false;

  event.preventDefault();
  view.dispatch(
    view.state.tr.setNodeMarkup(taskListItem.position, undefined, {
      ...taskListItem.node.attrs,
      checked: !taskListItem.node.attrs.checked,
    }),
  );

  return true;
}

export const taskListTogglePlugin = $prose(
  () =>
    new Plugin({
      key: taskListTogglePluginKey,
      props: {
        handleDOMEvents: {
          mousedown(view, event) {
            return toggleTaskListItemFromMarkerClick(view, event);
          },
        },
      },
    }),
);
