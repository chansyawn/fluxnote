import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/extension";
import {
  $convertFromMarkdownString,
  type ElementTransformer,
  type MultilineElementTransformer,
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  type Transformer,
} from "@lexical/markdown";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { $createParagraphNode, type ElementNode } from "lexical";

import { NOTE_EDITOR_IMAGE_TRANSFORMER } from "@/features/note-editor-core/image/note-editor-image-markdown";

const TABLE_ROW_REGEXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_DIVIDER_REGEXP = /^(\| *(?::?-{3,}:?) *)+\|\s?$/;
const HORIZONTAL_RULE_REGEXP = /^(---|\*\*\*|___)\s?$/;

const TABLE_CELL_MARKDOWN_TRANSFORMERS: Transformer[] = [
  ...TEXT_FORMAT_TRANSFORMERS,
  NOTE_EDITOR_IMAGE_TRANSFORMER,
  ...TEXT_MATCH_TRANSFORMERS,
];

export function isMarkdownTableRow(line: string): boolean {
  return TABLE_ROW_REGEXP.test(line);
}

export function isMarkdownTableDividerRow(line: string): boolean {
  return TABLE_DIVIDER_REGEXP.test(line);
}

export function splitTableRow(line: string): string[] {
  const content = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|\s*$/, "");
  const cells: string[] = [];
  let current = "";
  let inCodeSpan = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === "\\") {
      if (nextChar === "|" || nextChar === "\\") {
        current += nextChar;
        index += 1;
        continue;
      }

      current += char;
      continue;
    }

    if (char === "`") {
      inCodeSpan = !inCodeSpan;
      current += char;
      continue;
    }

    if (char === "|" && !inCodeSpan) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells;
}

function getTableColumnCount(headerLine: string, dividerLine: string, bodyLines: string[]): number {
  const rowLengths = [
    splitTableRow(headerLine).length,
    splitTableRow(dividerLine).length,
    ...bodyLines.map((line) => splitTableRow(line).length),
  ];

  return Math.max(...rowLengths);
}

function getNormalizedTableRows(lines: string[], columnCount: number): string[][] {
  return lines.map((line) => {
    const cells = splitTableRow(line);

    if (cells.length >= columnCount) {
      return cells.slice(0, columnCount);
    }

    return [...cells, ...Array.from({ length: columnCount - cells.length }, () => "")];
  });
}

function appendTableCellContent(cellNode: TableCellNode, cellMarkdown: string): void {
  if (cellMarkdown.length === 0) {
    cellNode.append($createParagraphNode());
    return;
  }

  $convertFromMarkdownString(cellMarkdown, TABLE_CELL_MARKDOWN_TRANSFORMERS, cellNode);
}

function escapeTableCellContent(content: string): string {
  return content.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function normalizeExportedTableCell(content: string): string {
  const normalizedContent = content
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return escapeTableCellContent(normalizedContent);
}

function getTableCellMarkdown(
  cellNode: TableCellNode,
  traverseChildren: (node: ElementNode) => string,
): string {
  const content = normalizeExportedTableCell(traverseChildren(cellNode));

  return content.length > 0 ? content : " ";
}

function buildTableMarkdown(
  tableNode: TableNode,
  traverseChildren: (node: ElementNode) => string,
): string | null {
  const rowNodes = tableNode.getChildren().filter($isTableRowNode);

  if (rowNodes.length === 0) {
    return null;
  }

  const rows = rowNodes.map((rowNode) => {
    const cellNodes = rowNode.getChildren().filter($isTableCellNode);

    return cellNodes.map((cellNode) => getTableCellMarkdown(cellNode, traverseChildren));
  });

  if (rows[0].length === 0) {
    return null;
  }

  const headerRow = rows[0];
  const dividerRow = `| ${headerRow.map(() => "---").join(" | ")} |`;
  const markdownRows = [`| ${headerRow.join(" | ")} |`, dividerRow];

  for (const row of rows.slice(1)) {
    markdownRows.push(`| ${row.join(" | ")} |`);
  }

  return markdownRows.join("\n");
}

function createEmptyTableBodyRow(columnCount: number): TableRowNode {
  const rowNode = $createTableRowNode();

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const cellNode = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
    cellNode.append($createParagraphNode());
    rowNode.append(cellNode);
  }

  return rowNode;
}

export function createTableNodeFromMarkdownLines(
  lines: string[],
  options?: {
    appendEmptyBodyRow?: boolean;
  },
): TableNode {
  const [headerLine, dividerLine, ...bodyLines] = lines;
  const columnCount = getTableColumnCount(headerLine, dividerLine, bodyLines);
  const tableNode = $createTableNode();
  const normalizedRows = getNormalizedTableRows([headerLine, ...bodyLines], columnCount);

  normalizedRows.forEach((rowCells, rowIndex) => {
    const rowNode = $createTableRowNode();

    rowCells.forEach((cellMarkdown) => {
      const headerState =
        rowIndex === 0 ? TableCellHeaderStates.COLUMN : TableCellHeaderStates.NO_STATUS;
      const cellNode = $createTableCellNode(headerState);

      appendTableCellContent(cellNode, cellMarkdown);
      rowNode.append(cellNode);
    });

    tableNode.append(rowNode);
  });

  if (options?.appendEmptyBodyRow && normalizedRows.length === 1) {
    tableNode.append(createEmptyTableBodyRow(columnCount));
  }

  return tableNode;
}

function createTableNodeFromMarkdown(rootNode: ElementNode, lines: string[]): void {
  rootNode.append(createTableNodeFromMarkdownLines(lines));
}

const HORIZONTAL_RULE_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? "---" : null;
  },
  regExp: HORIZONTAL_RULE_REGEXP,
  replace: (parentNode, _children, _match, isImport) => {
    const lineNode = $createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(lineNode);
    } else {
      parentNode.insertBefore(lineNode);
    }

    lineNode.selectNext();
  },
  type: "element",
};

const TABLE_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node, traverseChildren) => {
    return $isTableNode(node) ? buildTableMarkdown(node, traverseChildren) : null;
  },
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
    const dividerLine = lines[startLineIndex + 1];

    if (!dividerLine || !TABLE_DIVIDER_REGEXP.test(dividerLine)) {
      return null;
    }

    const tableLines = [lines[startLineIndex], dividerLine];
    let currentLineIndex = startLineIndex + 2;

    while (currentLineIndex < lines.length && TABLE_ROW_REGEXP.test(lines[currentLineIndex])) {
      tableLines.push(lines[currentLineIndex]);
      currentLineIndex += 1;
    }

    createTableNodeFromMarkdown(rootNode, tableLines);

    return [true, currentLineIndex - 1];
  },
  regExpStart: TABLE_ROW_REGEXP,
  replace: (_rootNode, _children, _startMatch, _endMatch, _linesInBetween, _isImport) => {
    return false;
  },
  type: "multiline-element",
};

const NOTE_EDITOR_ELEMENT_TRANSFORMERS: Transformer[] = [
  ...ELEMENT_TRANSFORMERS,
  CHECK_LIST,
  HORIZONTAL_RULE_TRANSFORMER,
];

const NOTE_EDITOR_MULTILINE_TRANSFORMERS: Transformer[] = [
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  TABLE_TRANSFORMER,
];

export const NOTE_EDITOR_MARKDOWN_TRANSFORMERS: Transformer[] = [
  ...NOTE_EDITOR_ELEMENT_TRANSFORMERS,
  ...NOTE_EDITOR_MULTILINE_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  NOTE_EDITOR_IMAGE_TRANSFORMER,
  ...TEXT_MATCH_TRANSFORMERS,
];
