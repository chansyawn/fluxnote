import {
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from "@lexical/table";
import { $getNearestNodeFromDOMNode, type LexicalEditor, type NodeKey } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getTableCellColumnIndex,
  getTableCellRowIndex,
  getTableColumnCount,
  getTableRowCount,
} from "./table-operations";

export type TableControlKind = "row" | "column";

export interface TableHandlePosition {
  blockStart: number;
  inlineStart: number;
}

export interface TableControlTarget {
  cellKey: NodeKey;
  tableKey: NodeKey;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
  handles: Record<TableControlKind, TableHandlePosition>;
}

interface TableControlDocumentTarget extends Omit<TableControlTarget, "cellKey" | "handles"> {
  cellKey: NodeKey;
  columnStartKey: NodeKey;
  rowStartKey: NodeKey;
}

export function getEditorShellElement(editorRootElement: HTMLElement | null): HTMLElement | null {
  return editorRootElement?.closest<HTMLElement>(".block-editor__shell") ?? null;
}

function toShellRect(shellRect: DOMRect, cellRect: DOMRect, shell: HTMLElement): DOMRect {
  return DOMRect.fromRect({
    height: cellRect.height,
    width: cellRect.width,
    x: cellRect.left - shellRect.left + shell.scrollLeft,
    y: cellRect.top - shellRect.top + shell.scrollTop,
  });
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

      return {
        cellKey: cellNode.getKey(),
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

function readControlTarget(editor: LexicalEditor, cellKey: NodeKey): TableControlTarget | null {
  const shell = getEditorShellElement(editor.getRootElement());
  const cellElement = editor.getElementByKey(cellKey);
  if (!shell || !cellElement) return null;

  const documentTarget = readDocumentTarget(editor, cellElement);
  if (!documentTarget) return null;

  const columnStartElement = editor.getElementByKey(documentTarget.columnStartKey);
  const rowStartElement = editor.getElementByKey(documentTarget.rowStartKey);
  if (!columnStartElement || !rowStartElement) return null;

  const shellRect = shell.getBoundingClientRect();
  const columnStartRect = toShellRect(shellRect, columnStartElement.getBoundingClientRect(), shell);
  const rowStartRect = toShellRect(shellRect, rowStartElement.getBoundingClientRect(), shell);

  return {
    cellKey: documentTarget.cellKey,
    columnCount: documentTarget.columnCount,
    columnIndex: documentTarget.columnIndex,
    handles: {
      column: {
        blockStart: columnStartRect.top,
        inlineStart: columnStartRect.left + columnStartRect.width / 2,
      },
      row: {
        blockStart: rowStartRect.top + rowStartRect.height / 2,
        inlineStart: rowStartRect.left,
      },
    },
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
  const shellElement = getEditorShellElement(editor.getRootElement());

  const setOpenMenu = useCallback((nextActiveMenu: TableControlKind | null) => {
    activeMenuRef.current = nextActiveMenu;
    setActiveMenu(nextActiveMenu);
  }, []);

  const updateTarget = useCallback(
    (cellKey: NodeKey | null) => {
      activeCellKeyRef.current = cellKey;
      const nextTarget = cellKey ? readControlTarget(editor, cellKey) : null;
      setTarget((previousTarget) =>
        areTargetsEqual(previousTarget, nextTarget) ? previousTarget : nextTarget,
      );
    },
    [editor],
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
    const shell = getEditorShellElement(editor.getRootElement());
    if (!shell) return;

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

    shell.addEventListener("pointermove", handlePointerMove);
    shell.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      shell.removeEventListener("pointermove", handlePointerMove);
      shell.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [clearTarget, clearTargetIfIdle, editor, updateTarget]);

  return {
    activeMenu,
    clearTarget,
    clearTargetIfIdle,
    scheduleMeasure,
    setActiveMenu: setOpenMenu,
    setPointerOverControls: (nextPointerOverControls: boolean) => {
      pointerOverControlsRef.current = nextPointerOverControls;
    },
    shellElement,
    target,
  };
}
