import type { MultilineElementTransformer } from "@lexical/markdown";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellHeaderStates,
  TableNode,
  TableRowNode,
  TableCellNode,
} from "@lexical/table";
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  $isParagraphNode,
  type ElementFormatType,
  type ElementNode,
} from "lexical";
import type { AlignType } from "mdast";

type TableAlign = AlignType | null;

const TABLE_ROW_REG_EXP = /^\|(.+)\|\s*$/;
const TABLE_DIMENSION_REG_EXP = /^\|\s*(\d+)\s*[xX]\s*(\d+)\s*\|\s*$/;
const TABLE_SHORTCUT_REG_EXP = /^\|(?:(?:\s*:?-{3,}:?\s*\|)+|\s*\d+\s*[xX]\s*\d+\s*\|\s*)$/;
const CELL_SEPARATOR_REG_EXP = /(?<!\\)\|/;
const MAX_TABLE_DIMENSION = 20;

interface TableDimensions {
  columns: number;
  rows: number;
}

function splitTableRow(line: string): string[] | null {
  const match = TABLE_ROW_REG_EXP.exec(line);
  if (!match) {
    return null;
  }

  return match[1].split(CELL_SEPARATOR_REG_EXP).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function parseDelimiterAlign(line: string): TableAlign[] | null {
  const cells = splitTableRow(line);
  if (!cells || cells.length === 0) {
    return null;
  }

  const align: TableAlign[] = [];
  for (const cell of cells) {
    if (!/^:?-{3,}:?$/.test(cell)) {
      return null;
    }

    align.push(
      cell.startsWith(":") && cell.endsWith(":")
        ? "center"
        : cell.startsWith(":")
          ? "left"
          : cell.endsWith(":")
            ? "right"
            : null,
    );
  }

  return align;
}

function tableAlignToElementFormat(align: TableAlign): ElementFormatType {
  return align ?? "";
}

function parseTableDimensions(line: string): TableDimensions | null {
  const match = TABLE_DIMENSION_REG_EXP.exec(line);
  if (!match) {
    return null;
  }

  const columns = Number.parseInt(match[1], 10);
  const rows = Number.parseInt(match[2], 10);
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 1 ||
    rows < 1 ||
    columns > MAX_TABLE_DIMENSION ||
    rows > MAX_TABLE_DIMENSION
  ) {
    return null;
  }

  return { columns, rows };
}

function createTableCell(value: string, isHeader: boolean, align: TableAlign): TableCellNode {
  const cell = $createTableCellNode(
    isHeader ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
  );
  const paragraph = $createParagraphNode();
  paragraph.setFormat(tableAlignToElementFormat(align));
  if (value.length > 0) {
    paragraph.append($createTextNode(value));
  }
  cell.append(paragraph);
  return cell;
}

function createTableRow(
  cells: ReadonlyArray<string>,
  isHeader: boolean,
  align: ReadonlyArray<TableAlign>,
): TableRowNode {
  const row = $createTableRowNode();
  row.append(...cells.map((cell, index) => createTableCell(cell, isHeader, align[index] ?? null)));
  return row;
}

function createTable(
  headerCells: ReadonlyArray<string>,
  align: ReadonlyArray<TableAlign>,
): TableNode | null {
  if (headerCells.length === 0 || headerCells.length !== align.length) {
    return null;
  }

  const table = $createTableNode();
  table.append(
    createTableRow(headerCells, true, align),
    createTableRow(
      headerCells.map(() => ""),
      false,
      align,
    ),
  );
  return table;
}

function createEmptyTable({ columns, rows }: TableDimensions): TableNode {
  const table = $createTableNode();
  const cells = Array.from({ length: columns }, () => "");
  const align: TableAlign[] = Array.from({ length: columns }, () => null);
  table.append(
    ...Array.from({ length: rows }, (_, index) => createTableRow(cells, index === 0, align)),
  );
  return table;
}

function selectFirstCell(table: TableNode): void {
  const firstRow = table.getFirstChild();
  const firstCell = $isElementNode(firstRow) ? firstRow.getFirstChild() : null;
  const firstParagraph = $isElementNode(firstCell) ? firstCell.getFirstChild() : null;

  if ($isParagraphNode(firstParagraph)) {
    firstParagraph.selectStart();
  } else {
    table.selectStart();
  }
}

function replaceTypedTableShortcut(parentNode: ElementNode, startMatch: RegExpMatchArray): boolean {
  const delimiterLine = startMatch[0].trimEnd();
  const align = parseDelimiterAlign(delimiterLine);
  const previous = parentNode.getPreviousSibling();

  if (!align || !$isParagraphNode(previous)) {
    return false;
  }

  const headerCells = splitTableRow(previous.getTextContent());
  const table = headerCells ? createTable(headerCells, align) : null;
  if (!table) {
    return false;
  }

  previous.replace(table);
  parentNode.remove();
  table.selectEnd();
  return true;
}

function replaceTypedTableDimensionShortcut(
  parentNode: ElementNode,
  startMatch: RegExpMatchArray,
): boolean {
  const dimensions = parseTableDimensions(startMatch[0]);
  if (!dimensions) {
    return false;
  }

  const table = createEmptyTable(dimensions);
  parentNode.replace(table);
  selectFirstCell(table);
  return true;
}

export const TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  regExpEnd: { optional: true, regExp: /^$/ },
  regExpStart: TABLE_SHORTCUT_REG_EXP,
  replace: (rootNode, _children, startMatch, _endMatch, _linesInBetween, isImport) => {
    if (isImport) {
      return false;
    }

    if (replaceTypedTableDimensionShortcut(rootNode, startMatch as RegExpMatchArray)) {
      return true;
    }

    return replaceTypedTableShortcut(rootNode, startMatch as RegExpMatchArray);
  },
  type: "multiline-element",
};
