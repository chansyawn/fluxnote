import {
  $findCellNode,
  $findTableNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableRowNode,
  type TableCellNode,
} from "@lexical/table";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  type LexicalEditor,
  type RangeSelection,
} from "lexical";

import {
  getTableCellRowIndex,
  getTableRowCells,
  getTableRows,
  insertTableRowBelowCell,
} from "./table-operations";

function isPlainTableNavigationEvent(event: KeyboardEvent | null): event is KeyboardEvent {
  return !!event && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function getSelectedTableCell(selection: RangeSelection): TableCellNode | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const cellNode = $findCellNode(selection.anchor.getNode());
  if (!cellNode) {
    return null;
  }

  const tableNode = $findTableNode(cellNode);
  return tableNode?.is($getTableNodeFromLexicalNodeOrThrow(cellNode)) ? cellNode : null;
}

function getNextTableCell(cellNode: TableCellNode): TableCellNode | null {
  const nextSibling = cellNode.getNextSibling();
  if ($isTableCellNode(nextSibling)) {
    return nextSibling;
  }

  const rowNode = cellNode.getParent();
  if (!$isTableRowNode(rowNode)) {
    return null;
  }

  const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
  const nextRow = getTableRows(tableNode).at(getTableCellRowIndex(cellNode) + 1);
  if (nextRow) {
    return getTableRowCells(nextRow).at(0) ?? null;
  }

  const insertedRow = insertTableRowBelowCell(cellNode);
  return insertedRow ? (getTableRowCells(insertedRow).at(0) ?? null) : null;
}

function handleTableForwardNavigation(event: KeyboardEvent | null): boolean {
  if (!isPlainTableNavigationEvent(event)) {
    return false;
  }

  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const cellNode = getSelectedTableCell(selection);
  if (!cellNode) {
    return false;
  }

  const nextCell = getNextTableCell(cellNode);
  if (!nextCell) {
    return false;
  }

  event.preventDefault();
  nextCell.selectStart();
  return true;
}

export function registerTableKeyboardCommands(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_TAB_COMMAND,
      handleTableForwardNavigation,
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      handleTableForwardNavigation,
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
}
