import type { AlignType, Table, TableCell, TableRow } from "mdast";

import type {
  SemanticInline,
  SemanticTable,
  SemanticTableAlign,
  SemanticTableCell,
  SemanticTableRow,
} from "../../model";

function normalizeAlign(value: AlignType | undefined): SemanticTableAlign {
  return value === "left" || value === "center" || value === "right" ? value : null;
}

export function tableCellFromMdast(
  node: TableCell,
  readInlines: (children: TableCell["children"]) => SemanticInline[],
): SemanticTableCell {
  return {
    children: readInlines(node.children),
    type: "tableCell",
  };
}

export function tableRowFromMdast(
  node: TableRow,
  readInlines: (children: TableCell["children"]) => SemanticInline[],
): SemanticTableRow {
  return {
    cells: node.children.map((cell) => tableCellFromMdast(cell, readInlines)),
    type: "tableRow",
  };
}

export function tableFromMdast(
  node: Table,
  readInlines: (children: TableCell["children"]) => SemanticInline[],
): SemanticTable {
  return {
    align: (node.align ?? []).map(normalizeAlign),
    rows: node.children.map((row) => tableRowFromMdast(row, readInlines)),
    type: "table",
  };
}

export function tableCellToMdast(
  node: SemanticTableCell,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => TableCell["children"],
): TableCell {
  return {
    children: writeInlines(node.children),
    type: "tableCell",
  };
}

export function tableRowToMdast(
  node: SemanticTableRow,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => TableCell["children"],
): TableRow {
  return {
    children: node.cells.map((cell) => tableCellToMdast(cell, writeInlines)),
    type: "tableRow",
  };
}

export function tableToMdast(
  node: SemanticTable,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => TableCell["children"],
): Table {
  return {
    align: node.align,
    children: node.rows.map((row) => tableRowToMdast(row, writeInlines)),
    type: "table",
  };
}
