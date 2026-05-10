import {
  $createTableCellNode,
  $createTableRowNode,
  $deleteTableColumn,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableRowNode,
  $moveTableColumn,
  $removeTableRowAtIndex,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
  type TableRowNode,
} from "@lexical/table";
import { $createParagraphNode, $getNodeByKey, type LexicalEditor, type NodeKey } from "lexical";

export type TableStructureOperation =
  | "insert-column-left"
  | "insert-column-right"
  | "move-column-left"
  | "move-column-right"
  | "delete-column"
  | "insert-row-above"
  | "insert-row-below"
  | "move-row-up"
  | "move-row-down"
  | "delete-row";

export interface TableStructureOperationPayload {
  cellKey: NodeKey;
  operation: TableStructureOperation;
}

export function getTableColumnCount(tableNode: TableNode): number {
  return tableNode.getColumnCount();
}

export function getTableRowCount(tableNode: TableNode): number {
  return tableNode.getChildren().filter($isTableRowNode).length;
}

export function getTableCellColumnIndex(cellNode: TableCellNode): number {
  return $getTableColumnIndexFromTableCellNode(cellNode);
}

export function getTableCellRowIndex(cellNode: TableCellNode): number {
  return $getTableRowIndexFromTableCellNode(cellNode);
}

function getRows(tableNode: TableNode): TableRowNode[] {
  return tableNode.getChildren().filter($isTableRowNode);
}

function getCells(rowNode: TableRowNode): TableCellNode[] {
  return rowNode.getChildren().filter($isTableCellNode);
}

function getCellNodeAt(
  tableNode: TableNode,
  rowIndex: number,
  columnIndex: number,
): TableCellNode | null {
  const rowNode = getRows(tableNode).at(rowIndex);
  return rowNode ? (getCells(rowNode).at(columnIndex) ?? null) : null;
}

type TableCellHeaderState = (typeof TableCellHeaderStates)[keyof typeof TableCellHeaderStates];

function getHeaderState(
  currentState: TableCellHeaderState,
  possibleState: TableCellHeaderState,
): TableCellHeaderState {
  if (currentState === TableCellHeaderStates.BOTH || currentState === possibleState) {
    return possibleState;
  }

  return TableCellHeaderStates.NO_STATUS;
}

function createTableCell(headerState: TableCellHeaderState): TableCellNode {
  return $createTableCellNode(headerState).append($createParagraphNode());
}

function cloneEmptyRowFrom(rowNode: TableRowNode): TableRowNode {
  const clone = $createTableRowNode(rowNode.getHeight());
  for (const cell of getCells(rowNode)) {
    clone.append(
      createTableCell(getHeaderState(cell.getHeaderStyles(), TableCellHeaderStates.COLUMN)),
    );
  }
  return clone;
}

function insertTableRowAtCell(cellNode: TableCellNode, insertAfter: boolean): TableRowNode | null {
  const rowNode = cellNode.getParent();
  if (!$isTableRowNode(rowNode)) {
    return null;
  }

  const insertedRow = cloneEmptyRowFrom(rowNode);
  if (insertAfter) {
    rowNode.insertAfter(insertedRow);
    return insertedRow;
  }

  rowNode.insertBefore(insertedRow);
  return insertedRow;
}

function cloneEmptyCellFrom(cellNode: TableCellNode): TableCellNode {
  return createTableCell(getHeaderState(cellNode.getHeaderStyles(), TableCellHeaderStates.ROW));
}

function insertTableColumnAtCell(
  cellNode: TableCellNode,
  insertAfter: boolean,
): TableCellNode | null {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
  const columnIndex = getTableCellColumnIndex(cellNode);
  let firstInsertedCell: TableCellNode | null = null;

  for (const row of getRows(tableNode)) {
    const anchorCell = getCells(row).at(columnIndex);
    if (!anchorCell) continue;

    const insertedCell = cloneEmptyCellFrom(anchorCell);
    firstInsertedCell ??= insertedCell;
    if (insertAfter) {
      anchorCell.insertAfter(insertedCell);
    } else {
      anchorCell.insertBefore(insertedCell);
    }
  }

  const colWidths = tableNode.getColWidths();
  if (colWidths) {
    const nextColWidths = [...colWidths];
    const widthIndex = insertAfter ? columnIndex + 1 : columnIndex;
    nextColWidths.splice(widthIndex, 0, nextColWidths[columnIndex] ?? 0);
    tableNode.setColWidths(nextColWidths);
  }

  return firstInsertedCell;
}

function moveTableRow(rowNode: TableRowNode, targetRowIndex: number): void {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(rowNode);
  const rows = getRows(tableNode);
  const currentRowIndex = rows.findIndex((child) => child.is(rowNode));
  const targetRowNode = rows.at(targetRowIndex);

  if (currentRowIndex === -1 || !targetRowNode || currentRowIndex === targetRowIndex) {
    return;
  }

  if (currentRowIndex < targetRowIndex) {
    targetRowNode.insertAfter(rowNode);
  } else {
    targetRowNode.insertBefore(rowNode);
  }
}

function selectCell(cellNode: TableCellNode | null): void {
  cellNode?.selectStart();
}

function applyTableStructureOperation(payload: TableStructureOperationPayload): boolean {
  const node = $getNodeByKey(payload.cellKey);
  if (!$isTableCellNode(node)) {
    return false;
  }

  const tableNode = $getTableNodeFromLexicalNodeOrThrow(node);
  const rowNode = node.getParent();
  if (!$isTableRowNode(rowNode)) {
    return false;
  }

  const rowIndex = getTableCellRowIndex(node);
  const columnIndex = getTableCellColumnIndex(node);
  const rowCount = getTableRowCount(tableNode);
  const columnCount = getTableColumnCount(tableNode);

  switch (payload.operation) {
    case "insert-column-left": {
      const insertedCell = insertTableColumnAtCell(node, false);
      selectCell(insertedCell ?? getCellNodeAt(tableNode, rowIndex, columnIndex));
      return true;
    }
    case "insert-column-right": {
      const insertedCell = insertTableColumnAtCell(node, true);
      selectCell(insertedCell ?? getCellNodeAt(tableNode, rowIndex, columnIndex + 1));
      return true;
    }
    case "move-column-left": {
      if (columnIndex <= 0) return false;
      $moveTableColumn(tableNode, columnIndex, columnIndex - 1);
      selectCell(getCellNodeAt(tableNode, rowIndex, columnIndex - 1));
      return true;
    }
    case "move-column-right": {
      if (columnIndex < 0 || columnIndex >= columnCount - 1) return false;
      $moveTableColumn(tableNode, columnIndex, columnIndex + 1);
      selectCell(getCellNodeAt(tableNode, rowIndex, columnIndex + 1));
      return true;
    }
    case "delete-column": {
      if (columnCount <= 1) return false;
      $deleteTableColumn(tableNode, columnIndex);
      selectCell(getCellNodeAt(tableNode, rowIndex, Math.min(columnIndex, columnCount - 2)));
      return true;
    }
    case "insert-row-above": {
      const insertedRow = insertTableRowAtCell(node, false);
      selectCell(insertedRow ? (getCells(insertedRow).at(columnIndex) ?? null) : null);
      return true;
    }
    case "insert-row-below": {
      const insertedRow = insertTableRowAtCell(node, true);
      selectCell(insertedRow ? (getCells(insertedRow).at(columnIndex) ?? null) : null);
      return true;
    }
    case "move-row-up": {
      if (rowIndex <= 0) return false;
      moveTableRow(rowNode, rowIndex - 1);
      selectCell(getCellNodeAt(tableNode, rowIndex - 1, columnIndex));
      return true;
    }
    case "move-row-down": {
      if (rowIndex < 0 || rowIndex >= rowCount - 1) return false;
      moveTableRow(rowNode, rowIndex + 1);
      selectCell(getCellNodeAt(tableNode, rowIndex + 1, columnIndex));
      return true;
    }
    case "delete-row": {
      if (rowCount <= 1) return false;
      $removeTableRowAtIndex(tableNode, rowIndex);
      selectCell(getCellNodeAt(tableNode, Math.min(rowIndex, rowCount - 2), columnIndex));
      return true;
    }
  }
}

export function performTableStructureOperation(
  editor: LexicalEditor,
  payload: TableStructureOperationPayload,
): void {
  editor.update(
    () => {
      applyTableStructureOperation(payload);
    },
    { discrete: true },
  );
}
