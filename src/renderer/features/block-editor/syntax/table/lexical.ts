import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableRowNode,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
  type TableRowNode,
} from "@lexical/table";
import {
  $isElementNode,
  $isParagraphNode,
  type ElementFormatType,
  type LexicalNode,
  type ParagraphNode,
} from "lexical";

import type {
  SemanticInline,
  SemanticTable,
  SemanticTableAlign,
  SemanticTableCell,
  SemanticTableRow,
} from "../../model";
import { paragraphToLexical } from "../paragraph";

function tableAlignToElementFormat(align: SemanticTableAlign): ElementFormatType {
  return align ?? "";
}

function elementFormatToTableAlign(format: ElementFormatType): SemanticTableAlign {
  return format === "left" || format === "center" || format === "right" ? format : null;
}

function tableCellToLexical(
  node: SemanticTableCell,
  writeInline: (node: SemanticInline) => LexicalNode[],
  isHeader: boolean,
  align: SemanticTableAlign,
): TableCellNode {
  const cell = $createTableCellNode(
    isHeader ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
  );
  const paragraph = paragraphToLexical(
    { children: node.children, type: "paragraph" },
    writeInline,
  ) as ParagraphNode;
  paragraph.setFormat(tableAlignToElementFormat(align));
  cell.append(paragraph);
  return cell;
}

function tableRowToLexical(
  node: SemanticTableRow,
  writeInline: (node: SemanticInline) => LexicalNode[],
  isHeader: boolean,
  align: ReadonlyArray<SemanticTableAlign>,
): TableRowNode {
  const row = $createTableRowNode();
  row.append(
    ...node.cells.map((cell, index) =>
      tableCellToLexical(cell, writeInline, isHeader, align[index] ?? null),
    ),
  );
  return row;
}

export function tableToLexical(
  node: SemanticTable,
  writeInline: (node: SemanticInline) => LexicalNode[],
): TableNode {
  const table = $createTableNode();
  table.append(
    ...node.rows.map((row, index) => tableRowToLexical(row, writeInline, index === 0, node.align)),
  );
  return table;
}

function tableCellFromLexical(
  node: TableCellNode,
  readInlines: (children: ReadonlyArray<LexicalNode>) => SemanticInline[],
): SemanticTableCell {
  return {
    children: node
      .getChildren()
      .flatMap((child) => ($isElementNode(child) ? readInlines(child.getChildren()) : [])),
    type: "tableCell",
  };
}

function tableRowFromLexical(
  node: TableRowNode,
  readInlines: (children: ReadonlyArray<LexicalNode>) => SemanticInline[],
): SemanticTableRow {
  return {
    cells: node
      .getChildren()
      .flatMap((child) =>
        $isTableCellNode(child) ? [tableCellFromLexical(child, readInlines)] : [],
      ),
    type: "tableRow",
  };
}

function readTableAlign(node: TableNode): SemanticTableAlign[] {
  const firstRow = node.getFirstChild();
  if (!$isTableRowNode(firstRow)) {
    return [];
  }

  return firstRow.getChildren().map((cell) => {
    if (!$isTableCellNode(cell)) {
      return null;
    }

    const firstChild = cell.getFirstChild();
    return $isParagraphNode(firstChild)
      ? elementFormatToTableAlign(firstChild.getFormatType())
      : null;
  });
}

export function tableFromLexical(
  node: TableNode,
  readInlines: (children: ReadonlyArray<LexicalNode>) => SemanticInline[],
): SemanticTable {
  return {
    align: readTableAlign(node),
    rows: node
      .getChildren()
      .flatMap((child) =>
        $isTableRowNode(child) ? [tableRowFromLexical(child, readInlines)] : [],
      ),
    type: "table",
  };
}
