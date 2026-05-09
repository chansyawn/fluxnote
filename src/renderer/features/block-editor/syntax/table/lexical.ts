import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  type TableCellNode,
  type TableRowNode,
} from "@lexical/table";
import {
  $isElementNode,
  $isParagraphNode,
  type ElementFormatType,
  type LexicalNode,
  type ParagraphNode,
} from "lexical";
import type { AlignType, PhrasingContent, Table, TableCell, TableRow } from "mdast";

import { paragraphToLexical } from "../paragraph";

function alignToFormat(align: AlignType | null | undefined): ElementFormatType {
  return align === "left" || align === "center" || align === "right" ? align : "";
}

function formatToAlign(format: ElementFormatType): AlignType | null {
  return format === "left" || format === "center" || format === "right" ? format : null;
}

function tableCellToLexical(
  cell: TableCell,
  writeInline: (child: PhrasingContent) => LexicalNode[],
  isHeader: boolean,
  align: AlignType | null,
): TableCellNode {
  const cellNode = $createTableCellNode(
    isHeader ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
  );
  const paragraph = paragraphToLexical(
    { children: cell.children, type: "paragraph" },
    writeInline,
  ) as ParagraphNode;
  paragraph.setFormat(alignToFormat(align));
  cellNode.append(paragraph);
  return cellNode;
}

function tableRowToLexical(
  row: TableRow,
  writeInline: (child: PhrasingContent) => LexicalNode[],
  isHeader: boolean,
  align: ReadonlyArray<AlignType | null>,
): TableRowNode {
  const rowNode = $createTableRowNode();
  rowNode.append(
    ...row.children.map((cell, index) =>
      tableCellToLexical(cell, writeInline, isHeader, align[index] ?? null),
    ),
  );
  return rowNode;
}

export function tableToLexical(
  node: Table,
  writeInline: (child: PhrasingContent) => LexicalNode[],
): LexicalNode {
  const align: ReadonlyArray<AlignType | null> = node.align ?? [];
  const table = $createTableNode();
  table.append(
    ...node.children.map((row, index) => tableRowToLexical(row, writeInline, index === 0, align)),
  );
  return table;
}

function tableCellFromLexical(
  cell: TableCellNode,
  readInline: (child: LexicalNode) => PhrasingContent[],
): TableCell {
  return {
    children: cell
      .getChildren()
      .flatMap((child) => ($isElementNode(child) ? child.getChildren().flatMap(readInline) : []))
      // GFM table source syntax cannot represent a hard break inside a cell —
      // a literal newline would close the row. Drop break nodes; soft line
      // wrapping inside a cell is the closest approximation we support.
      .filter((node): node is TableCell["children"][number] => node.type !== "break"),
    type: "tableCell",
  };
}

function tableRowFromLexical(
  row: TableRowNode,
  readInline: (child: LexicalNode) => PhrasingContent[],
): TableRow {
  return {
    children: row
      .getChildren()
      .flatMap((child) =>
        $isTableCellNode(child) ? [tableCellFromLexical(child, readInline)] : [],
      ),
    type: "tableRow",
  };
}

function readTableAlign(node: LexicalNode): Array<AlignType | null> {
  if (!$isTableNode(node)) return [];
  const firstRow = node.getFirstChild();
  if (!$isTableRowNode(firstRow)) return [];

  return firstRow.getChildren().map((cell) => {
    if (!$isTableCellNode(cell)) return null;
    const firstChild = cell.getFirstChild();
    return $isParagraphNode(firstChild) ? formatToAlign(firstChild.getFormatType()) : null;
  });
}

export function tableFromLexical(
  node: LexicalNode,
  readInline: (child: LexicalNode) => PhrasingContent[],
): Table | null {
  if (!$isTableNode(node)) return null;

  return {
    align: readTableAlign(node),
    children: node
      .getChildren()
      .flatMap((child) => ($isTableRowNode(child) ? [tableRowFromLexical(child, readInline)] : [])),
    type: "table",
  };
}
