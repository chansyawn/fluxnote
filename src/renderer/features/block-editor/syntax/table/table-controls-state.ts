import {
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from "@lexical/table";
import {
  $getNearestNodeFromDOMNode,
  $isParagraphNode,
  type ElementFormatType,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorOverlayContainer } from "../../core/editor-overlay-container";
import {
  getTableCellColumnIndex,
  getTableCellRowIndex,
  getTableColumnCount,
  getTableRowCount,
  type TableColumnAlign,
} from "./table-operations";

export type TableControlKind = "row" | "column";

export interface TableHandlePosition {
  blockStart: number;
  inlineStart: number;
}

export interface TableControlTarget {
  cellKey: NodeKey;
  tableKey: NodeKey;
  columnAlign: TableColumnAlign;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
  handles: Record<TableControlKind, TableHandlePosition>;
}

type TableControlDocumentTarget = Omit<TableControlTarget, "cellKey" | "handles"> & {
  cellKey: NodeKey;
  columnStartKey: NodeKey;
  rowStartKey: NodeKey;
};

interface TableHandleLayoutInput {
  columnStartRect: DOMRect;
  rowStartRect: DOMRect;
  tableWrapperRect: DOMRect;
}

const TABLE_SCROLLABLE_WRAPPER_SELECTOR = ".block-editor__table-scrollable-wrapper";

function toShellRect(shellRect: DOMRect, cellRect: DOMRect, shell: HTMLElement): DOMRect {
  return DOMRect.fromRect({
    height: cellRect.height,
    width: cellRect.width,
    x: cellRect.left - shellRect.left + shell.scrollLeft,
    y: cellRect.top - shellRect.top + shell.scrollTop,
  });
}

export function calculateTableHandlePositions({
  columnStartRect,
  rowStartRect,
  tableWrapperRect,
}: TableHandleLayoutInput): Record<TableControlKind, TableHandlePosition> {
  return {
    column: {
      blockStart: columnStartRect.top,
      inlineStart: columnStartRect.left + columnStartRect.width / 2,
    },
    row: {
      blockStart: rowStartRect.top + rowStartRect.height / 2,
      inlineStart: tableWrapperRect.left,
    },
  };
}

function arePositionsEqual(a: TableHandlePosition, b: TableHandlePosition): boolean {
  return a.blockStart === b.blockStart && a.inlineStart === b.inlineStart;
}

function areTargetsEqual(
  previous: TableControlTarget | null,
  next: TableControlTarget | null,
): boolean {
  if (!previous || !next) return previous === next;

  return (
    previous.cellKey === next.cellKey &&
    previous.tableKey === next.tableKey &&
    previous.columnAlign === next.columnAlign &&
    previous.rowIndex === next.rowIndex &&
    previous.columnIndex === next.columnIndex &&
    previous.rowCount === next.rowCount &&
    previous.columnCount === next.columnCount &&
    arePositionsEqual(previous.handles.column, next.handles.column) &&
    arePositionsEqual(previous.handles.row, next.handles.row)
  );
}

function findCellFromTarget(target: EventTarget | null): HTMLTableCellElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLTableCellElement>(".block-editor__table-cell");
}

function findControlFromTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest("[data-table-control]");
}

function getCellKeyFromElement(
  editor: LexicalEditor,
  cellElement: HTMLTableCellElement,
): NodeKey | null {
  return editor.getEditorState().read(
    () => {
      const node = $getNearestNodeFromDOMNode(cellElement);
      const cellNode = $isTableCellNode(node) ? node : null;
      const tableNode = cellNode ? $getTableNodeFromLexicalNodeOrThrow(cellNode) : null;
      return cellNode && $isTableNode(tableNode) ? cellNode.getKey() : null;
    },
    { editor },
  );
}

function formatToColumnAlign(format: ElementFormatType): TableColumnAlign {
  return format === "left" || format === "center" || format === "right" ? format : "none";
}

function readDocumentTarget(
  editor: LexicalEditor,
  cellElement: HTMLElement,
): TableControlDocumentTarget | null {
  return editor.getEditorState().read(
    () => {
      const node = $getNearestNodeFromDOMNode(cellElement);
      const cellNode = $isTableCellNode(node) ? node : null;
      const tableNode = cellNode ? $getTableNodeFromLexicalNodeOrThrow(cellNode) : null;
      if (!cellNode || !$isTableNode(tableNode)) return null;

      const rows = tableNode.getChildren().filter($isTableRowNode);
      const rowIndex = getTableCellRowIndex(cellNode);
      const columnIndex = getTableCellColumnIndex(cellNode);
      const rowStartNode = rows.at(rowIndex)?.getChildren().filter($isTableCellNode).at(0);
      const columnStartNode = rows.at(0)?.getChildren().filter($isTableCellNode).at(columnIndex);
      if (!rowStartNode || !columnStartNode) return null;

      const columnStartFirstChild = columnStartNode.getFirstChild();

      return {
        cellKey: cellNode.getKey(),
        columnAlign: $isParagraphNode(columnStartFirstChild)
          ? formatToColumnAlign(columnStartFirstChild.getFormatType())
          : "none",
        columnCount: getTableColumnCount(tableNode),
        columnIndex,
        columnStartKey: columnStartNode.getKey(),
        rowCount: getTableRowCount(tableNode),
        rowIndex,
        rowStartKey: rowStartNode.getKey(),
        tableKey: tableNode.getKey(),
      };
    },
    { editor },
  );
}

function readControlTarget(
  editor: LexicalEditor,
  shell: HTMLElement | null,
  cellKey: NodeKey,
): TableControlTarget | null {
  const cellElement = editor.getElementByKey(cellKey);
  if (!shell || !cellElement) return null;

  const documentTarget = readDocumentTarget(editor, cellElement);
  if (!documentTarget) return null;

  const columnStartElement = editor.getElementByKey(documentTarget.columnStartKey);
  const rowStartElement = editor.getElementByKey(documentTarget.rowStartKey);
  const tableWrapperElement = cellElement.closest<HTMLElement>(TABLE_SCROLLABLE_WRAPPER_SELECTOR);
  if (!columnStartElement || !rowStartElement || !tableWrapperElement) return null;

  const shellRect = shell.getBoundingClientRect();
  const columnStartRect = toShellRect(shellRect, columnStartElement.getBoundingClientRect(), shell);
  const rowStartRect = toShellRect(shellRect, rowStartElement.getBoundingClientRect(), shell);
  const tableWrapperRect = toShellRect(
    shellRect,
    tableWrapperElement.getBoundingClientRect(),
    shell,
  );

  return {
    cellKey: documentTarget.cellKey,
    columnAlign: documentTarget.columnAlign,
    columnCount: documentTarget.columnCount,
    columnIndex: documentTarget.columnIndex,
    handles: calculateTableHandlePositions({ columnStartRect, rowStartRect, tableWrapperRect }),
    rowCount: documentTarget.rowCount,
    rowIndex: documentTarget.rowIndex,
    tableKey: documentTarget.tableKey,
  };
}

export function useTableControlState(editor: LexicalEditor) {
  const [target, setTarget] = useState<TableControlTarget | null>(null);
  const [activeMenu, setActiveMenu] = useState<TableControlKind | null>(null);
  const activeCellKeyRef = useRef<NodeKey | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const pointerOverControlsRef = useRef(false);
  const activeMenuRef = useRef<TableControlKind | null>(null);
  const overlayContainer = useEditorOverlayContainer();

  const setOpenMenu = useCallback((nextActiveMenu: TableControlKind | null) => {
    activeMenuRef.current = nextActiveMenu;
    setActiveMenu(nextActiveMenu);
  }, []);

  const updateTarget = useCallback(
    (cellKey: NodeKey | null) => {
      activeCellKeyRef.current = cellKey;
      const nextTarget = cellKey ? readControlTarget(editor, overlayContainer, cellKey) : null;
      setTarget((previousTarget) =>
        areTargetsEqual(previousTarget, nextTarget) ? previousTarget : nextTarget,
      );
    },
    [editor, overlayContainer],
  );

  const clearTarget = useCallback(() => {
    updateTarget(null);
  }, [updateTarget]);

  const clearTargetIfIdle = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (activeMenuRef.current || pointerOverControlsRef.current) return;
      clearTarget();
    });
  }, [clearTarget]);

  const scheduleMeasure = useCallback(() => {
    if (animationFrameIdRef.current !== null) return;

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      animationFrameIdRef.current = null;
      updateTarget(activeCellKeyRef.current);
    });
  }, [updateTarget]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      scheduleMeasure();
    });
  }, [editor, scheduleMeasure]);

  useEffect(() => {
    scheduleMeasure();
  }, [scheduleMeasure]);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [scheduleMeasure]);

  useEffect(() => {
    if (!overlayContainer) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (findControlFromTarget(event.target)) return;

      const cellElement = findCellFromTarget(event.target);
      if (!cellElement) {
        if (!activeMenuRef.current) clearTarget();
        return;
      }

      updateTarget(getCellKeyFromElement(editor, cellElement));
    };

    const handlePointerLeave = () => {
      clearTargetIfIdle();
    };

    overlayContainer.addEventListener("pointermove", handlePointerMove);
    overlayContainer.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      overlayContainer.removeEventListener("pointermove", handlePointerMove);
      overlayContainer.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [clearTarget, clearTargetIfIdle, editor, overlayContainer, updateTarget]);

  return {
    activeMenu,
    clearTarget,
    clearTargetIfIdle,
    scheduleMeasure,
    setActiveMenu: setOpenMenu,
    setPointerOverControls: (nextPointerOverControls: boolean) => {
      pointerOverControlsRef.current = nextPointerOverControls;
    },
    overlayContainer,
    target,
  };
}
