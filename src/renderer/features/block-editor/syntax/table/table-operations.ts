import {
  $createTableCellNode,
  $createTableRowNode,
  $deleteTableColumn,
  $getTableNodeFromLexicalNodeOrThrow,
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
  const rowNode = cellNode.getParent();
  if (!$isTableRowNode(rowNode)) {
    return -1;
  }

  return rowNode.getChildren().findIndex((child) => child.is(cellNode));
}

export function getTableCellRowIndex(cellNode: TableCellNode): number {
  const rowNode = cellNode.getParent();
  const tableNode = rowNode?.getParent();
  if (!$isTableRowNode(rowNode) || !tableNode) {
    return -1;
  }

  return tableNode
    .getChildren()
    .filter($isTableRowNode)
    .findIndex((child) => child.is(rowNode));
}

function getCellNodeAt(
  tableNode: TableNode,
  rowIndex: number,
  columnIndex: number,
): TableCellNode | null {
  const rowNode = tableNode.getChildren().filter($isTableRowNode).at(rowIndex);
  const cellNode = rowNode?.getChildren().filter($isTableCellNode).at(columnIndex);
  return cellNode ?? null;
}

type TableCellHeaderState = (typeof TableCellHeaderStates)[keyof typeof TableCellHeaderStates];

function createTableCell(headerState: TableCellHeaderState): TableCellNode {
  return $createTableCellNode(headerState).append($createParagraphNode());
}

function getHeaderState(
  currentState: TableCellHeaderState,
  possibleState: TableCellHeaderState,
): TableCellHeaderState {
  if (currentState === TableCellHeaderStates.BOTH || currentState === possibleState) {
    return possibleState;
  }

  return TableCellHeaderStates.NO_STATUS;
}

function insertTableRowAtCell(cellNode: TableCellNode, insertAfter: boolean): TableRowNode | null {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
  const rowIndex = getTableCellRowIndex(cellNode);
  const targetRow = tableNode.getChildren().filter($isTableRowNode).at(rowIndex);
  if (!targetRow) {
    return null;
  }

  const newRow = $createTableRowNode();
  for (const cell of targetRow.getChildren().filter($isTableCellNode)) {
    newRow.append(
      createTableCell(getHeaderState(cell.getHeaderStyles(), TableCellHeaderStates.COLUMN)),
    );
  }

  if (insertAfter) {
    targetRow.insertAfter(newRow);
    return newRow;
  }

  targetRow.insertBefore(newRow);
  return newRow;
}

function insertTableColumnAtCell(
  cellNode: TableCellNode,
  insertAfter: boolean,
): TableCellNode | null {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
  const columnIndex = getTableCellColumnIndex(cellNode);
  let firstInsertedCell: TableCellNode | null = null;

  for (const row of tableNode.getChildren().filter($isTableRowNode)) {
    const cells = row.getChildren().filter($isTableCellNode);
    const anchorCell = cells.at(columnIndex);
    if (!anchorCell) continue;

    const insertedCell = createTableCell(
      getHeaderState(anchorCell.getHeaderStyles(), TableCellHeaderStates.ROW),
    );
    if (!firstInsertedCell) {
      firstInsertedCell = insertedCell;
    }

    if (insertAfter) {
      anchorCell.insertAfter(insertedCell);
    } else {
      anchorCell.insertBefore(insertedCell);
    }
  }

  const colWidths = tableNode.getColWidths();
  if (colWidths) {
    const newColWidths = [...colWidths];
    const widthIndex = insertAfter ? columnIndex + 1 : columnIndex;
    newColWidths.splice(widthIndex, 0, newColWidths[columnIndex] ?? 0);
    tableNode.setColWidths(newColWidths);
  }

  return firstInsertedCell;
}

function moveTableRow(rowNode: TableRowNode, targetRowIndex: number): void {
  const tableNode = rowNode.getParentOrThrow();
  const rows = tableNode.getChildren().filter($isTableRowNode);
  const currentRowIndex = rows.findIndex((child) => child.is(rowNode));
  const targetRowNode = rows.at(targetRowIndex);

  if (currentRowIndex === -1 || !targetRowNode || currentRowIndex === targetRowIndex) {
    return;
  }

  if (currentRowIndex < targetRowIndex) {
    targetRowNode.insertAfter(rowNode);
    return;
  }

  targetRowNode.insertBefore(rowNode);
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
      selectCell(insertedRow?.getChildren().filter($isTableCellNode).at(columnIndex) ?? null);
      return true;
    }
    case "insert-row-below": {
      const insertedRow = insertTableRowAtCell(node, true);
      selectCell(insertedRow?.getChildren().filter($isTableCellNode).at(columnIndex) ?? null);
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
  editor.update(() => {
    applyTableStructureOperation(payload);
  });
}
