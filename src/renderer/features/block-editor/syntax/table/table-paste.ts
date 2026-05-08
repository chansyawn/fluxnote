import { $createLinkNode } from "@lexical/link";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
} from "@lexical/table";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type ElementFormatType,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from "lexical";
import type { AlignType, PhrasingContent, Table, TableCell } from "mdast";

import { parseMarkdownToMdast } from "../../markdown/processor";
import { $createImageNode } from "../image/image-node";

const GFM_TABLE_DELIMITER_LINE = /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/m;

function tableAlignToElementFormat(align: AlignType | undefined): ElementFormatType {
  return align === "left" || align === "center" || align === "right" ? align : "";
}

function applyTextFormats(node: TextNode, formats: ReadonlyArray<TextFormatType>): TextNode {
  for (const format of formats) {
    node.toggleFormat(format);
  }

  return node;
}

function textToLexicalNodes(value: string, formats: ReadonlyArray<TextFormatType>): LexicalNode[] {
  const parts = value.split("\n");
  const nodes: LexicalNode[] = [];

  parts.forEach((part, index) => {
    if (index > 0) {
      nodes.push($createLineBreakNode());
    }

    if (part.length > 0) {
      nodes.push(applyTextFormats($createTextNode(part), formats));
    }
  });

  return nodes;
}

function phrasingToLexicalNodes(
  node: PhrasingContent,
  formats: ReadonlyArray<TextFormatType> = [],
): LexicalNode[] {
  switch (node.type) {
    case "text":
      return textToLexicalNodes(node.value, formats);
    case "break":
      return [$createLineBreakNode()];
    case "emphasis":
      return node.children.flatMap((child) =>
        phrasingToLexicalNodes(child, [...formats, "italic"]),
      );
    case "strong":
      return node.children.flatMap((child) => phrasingToLexicalNodes(child, [...formats, "bold"]));
    case "delete":
      return node.children.flatMap((child) =>
        phrasingToLexicalNodes(child, [...formats, "strikethrough"]),
      );
    case "inlineCode":
      return [applyTextFormats($createTextNode(node.value), [...formats, "code"])];
    case "link": {
      const link = $createLinkNode(node.url, { title: node.title ?? null });
      link.append(...node.children.flatMap((child) => phrasingToLexicalNodes(child, formats)));
      return [link];
    }
    case "image":
      return [
        $createImageNode({
          alt: node.alt ?? "",
          src: node.url,
          title: node.title ?? null,
        }),
      ];
    default:
      return [];
  }
}

function tableCellToLexical(
  cell: TableCell | undefined,
  isHeader: boolean,
  align: AlignType | undefined,
): TableCellNode {
  const tableCell = $createTableCellNode(
    isHeader ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
  );
  const paragraph = $createParagraphNode();
  paragraph.setFormat(tableAlignToElementFormat(align));

  if (cell) {
    paragraph.append(...cell.children.flatMap((child) => phrasingToLexicalNodes(child)));
  }

  tableCell.append(paragraph);
  return tableCell;
}

function tableToLexicalNode(table: Table): TableNode | null {
  const columnCount = Math.max(...table.children.map((row) => row.children.length), 0);
  if (columnCount === 0) {
    return null;
  }

  const tableNode = $createTableNode();
  tableNode.append(
    ...table.children.map((row, rowIndex) => {
      const tableRow = $createTableRowNode();
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        tableRow.append(
          tableCellToLexical(row.children[columnIndex], rowIndex === 0, table.align?.[columnIndex]),
        );
      }
      return tableRow;
    }),
  );
  return tableNode;
}

function extractTablesFromMarkdown(markdown: string): Table[] {
  if (!GFM_TABLE_DELIMITER_LINE.test(markdown.trim())) {
    return [];
  }

  return parseMarkdownToMdast(markdown).children.flatMap((node): Table[] =>
    node.type === "table" ? [node] : [],
  );
}

export function insertMarkdownTablesAtSelection(
  editor: LexicalEditor,
  markdown: string,
  selection: BaseSelection | null,
): boolean {
  const tables = extractTablesFromMarkdown(markdown);
  if (tables.length === 0) {
    return false;
  }

  let didInsert = false;

  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      const tableNodes = tables.flatMap((table): TableNode[] => {
        const tableNode = tableToLexicalNode(table);
        return tableNode ? [tableNode] : [];
      });
      if (tableNodes.length === 0) {
        return;
      }

      const currentSelection = $getSelection();
      if ($isRangeSelection(currentSelection) || $isNodeSelection(currentSelection)) {
        currentSelection.insertNodes(tableNodes);
      } else {
        $getRoot().append(...tableNodes);
        tableNodes.at(-1)?.selectEnd();
      }
      didInsert = true;
    },
    { discrete: true },
  );

  return didInsert;
}
