import { findCellPos, findTable, TableMap } from "@milkdown/kit/prose/tables";
import type { EditorView } from "@milkdown/kit/prose/view";

export type TableControlKind = "row" | "column";
export type TableColumnAlign = "left" | "center" | "right";

export interface TableHandlePosition {
  blockStart: number;
  inlineStart: number;
}

export interface TableControlTarget {
  cellPos: number;
  tablePos: number;
  tableElement: HTMLTableElement;
  columnAlign: TableColumnAlign;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
  handles: Record<TableControlKind, TableHandlePosition>;
}

const TABLE_CELL_SELECTOR = "th,td";
const TABLE_CONTROL_SELECTOR = "[data-table-control]";

function isTableColumnAlign(value: unknown): value is TableColumnAlign {
  return value === "left" || value === "center" || value === "right";
}

function normalizeColumnAlign(value: unknown): TableColumnAlign {
  return isTableColumnAlign(value) ? value : "left";
}

function findCellElement(
  view: EditorView,
  target: EventTarget | null,
): HTMLTableCellElement | null {
  if (!(target instanceof Element)) return null;

  const cell = target.closest<HTMLTableCellElement>(TABLE_CELL_SELECTOR);
  if (!cell || !view.dom.contains(cell)) return null;

  return cell;
}

export function findTableControlElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest(TABLE_CONTROL_SELECTOR);
}

function findBlockEditorRoot(view: EditorView): HTMLElement | null {
  return view.dom.closest<HTMLElement>(".block-editor");
}

function toRootRect(rootRect: DOMRect, elementRect: DOMRect, root: HTMLElement): DOMRect {
  return DOMRect.fromRect({
    height: elementRect.height,
    width: elementRect.width,
    x: elementRect.left - rootRect.left + root.scrollLeft,
    y: elementRect.top - rootRect.top + root.scrollTop,
  });
}

function readTargetFromCellPos(
  view: EditorView,
  cellPos: number,
  cellElement: HTMLElement | null,
): TableControlTarget | null {
  const $cell = findCellPos(view.state.doc, cellPos);
  if (!$cell) return null;

  const table = findTable($cell);
  if (!table) return null;

  const map = TableMap.get(table.node);
  const cellRect = map.findCell($cell.pos - table.start);
  const columnIndex = cellRect.left;
  const rowIndex = cellRect.top;
  const columnStartCellPos = table.start + map.positionAt(0, columnIndex, table.node);
  const rowStartCellPos = table.start + map.positionAt(rowIndex, 0, table.node);
  const columnStartElement = view.nodeDOM(columnStartCellPos);
  const rowStartElement = view.nodeDOM(rowStartCellPos);
  const root = findBlockEditorRoot(view);

  if (
    !root ||
    !(columnStartElement instanceof HTMLElement) ||
    !(rowStartElement instanceof HTMLElement)
  ) {
    return null;
  }

  const rootRect = root.getBoundingClientRect();
  const columnRect = toRootRect(rootRect, columnStartElement.getBoundingClientRect(), root);
  const rowRect = toRootRect(rootRect, rowStartElement.getBoundingClientRect(), root);
  const currentCellElement = cellElement ?? view.nodeDOM($cell.pos);

  if (!(currentCellElement instanceof HTMLElement)) return null;

  const tableElement = currentCellElement.closest<HTMLTableElement>("table");

  if (!tableElement) return null;

  const tableRect = toRootRect(rootRect, tableElement.getBoundingClientRect(), root);
  const columnStartNode = table.node.nodeAt(map.positionAt(0, columnIndex, table.node));

  return {
    cellPos: $cell.pos,
    columnAlign: normalizeColumnAlign(columnStartNode?.attrs.alignment),
    columnCount: map.width,
    columnIndex,
    handles: {
      column: {
        blockStart: columnRect.top,
        inlineStart: columnRect.left + columnRect.width / 2,
      },
      row: {
        blockStart: rowRect.top + rowRect.height / 2,
        inlineStart: tableRect.left,
      },
    },
    rowCount: map.height,
    rowIndex,
    tableElement,
    tablePos: table.pos,
  };
}

export function readTableTargetFromCellPos(
  view: EditorView,
  cellPos: number,
): TableControlTarget | null {
  return readTargetFromCellPos(view, cellPos, null);
}

export function readTableTargetFromDom(
  view: EditorView,
  eventTarget: EventTarget | null,
): TableControlTarget | null {
  const cellElement = findCellElement(view, eventTarget);
  if (!cellElement) return null;

  return readTargetFromCellPos(view, view.posAtDOM(cellElement, 0), cellElement);
}

export function readTableTargetFromSelection(view: EditorView): TableControlTarget | null {
  return readTargetFromCellPos(view, view.state.selection.from, null);
}

export function areTableTargetsEqual(
  left: TableControlTarget | null,
  right: TableControlTarget | null,
): boolean {
  if (!left || !right) return left === right;

  return (
    left.cellPos === right.cellPos &&
    left.tablePos === right.tablePos &&
    left.tableElement === right.tableElement &&
    left.columnAlign === right.columnAlign &&
    left.rowIndex === right.rowIndex &&
    left.columnIndex === right.columnIndex &&
    left.rowCount === right.rowCount &&
    left.columnCount === right.columnCount &&
    left.handles.column.blockStart === right.handles.column.blockStart &&
    left.handles.column.inlineStart === right.handles.column.inlineStart &&
    left.handles.row.blockStart === right.handles.row.blockStart &&
    left.handles.row.inlineStart === right.handles.row.inlineStart
  );
}
