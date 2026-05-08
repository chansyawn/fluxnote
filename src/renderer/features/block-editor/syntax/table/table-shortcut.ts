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
  $isParagraphNode,
  type ElementFormatType,
  type ElementNode,
} from "lexical";

import type { SemanticTableAlign } from "../../model";

const TABLE_ROW_REG_EXP = /^\|(.+)\|\s*$/;
const TABLE_DELIMITER_REG_EXP = /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/;
const CELL_SEPARATOR_REG_EXP = /(?<!\\)\|/;

function splitTableRow(line: string): string[] | null {
  const match = TABLE_ROW_REG_EXP.exec(line);
  if (!match) {
    return null;
  }

  return match[1].split(CELL_SEPARATOR_REG_EXP).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function parseDelimiterAlign(line: string): SemanticTableAlign[] | null {
  const cells = splitTableRow(line);
  if (!cells || cells.length === 0) {
    return null;
  }

  const align: SemanticTableAlign[] = [];
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

function tableAlignToElementFormat(align: SemanticTableAlign): ElementFormatType {
  return align ?? "";
}

function createTableCell(
  value: string,
  isHeader: boolean,
  align: SemanticTableAlign,
): TableCellNode {
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
  align: ReadonlyArray<SemanticTableAlign>,
): TableRowNode {
  const row = $createTableRowNode();
  row.append(...cells.map((cell, index) => createTableCell(cell, isHeader, align[index] ?? null)));
  return row;
}

function createTable(
  headerCells: ReadonlyArray<string>,
  align: ReadonlyArray<SemanticTableAlign>,
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

export const TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  regExpEnd: { optional: true, regExp: /^$/ },
  regExpStart: TABLE_DELIMITER_REG_EXP,
  replace: (rootNode, _children, startMatch, _endMatch, _linesInBetween, isImport) => {
    if (isImport) {
      return false;
    }

    return replaceTypedTableShortcut(rootNode, startMatch as RegExpMatchArray);
  },
  type: "multiline-element",
};
