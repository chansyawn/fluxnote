import { TableCellNode } from "@lexical/table";
import {
  $createParagraphNode,
  $createTextNode,
  $isParagraphNode,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
} from "lexical";

import {
  collectTableCellInlineNodes,
  isAllowedTableCellInlineNode,
  stringifyTableCellBlockNode,
} from "./table-cell-content";

function appendLiteralMarkdown(target: ParagraphNode, markdown: string): void {
  const literal = markdown.trim();
  if (literal.length === 0) {
    return;
  }

  if (target.getTextContentSize() > 0) {
    target.append($createTextNode(" "));
  }
  target.append($createTextNode(literal));
}

function normalizeCellChild(child: LexicalNode, paragraph: ParagraphNode): void {
  const inlineNodes = collectTableCellInlineNodes(child);
  if (inlineNodes.length > 0) {
    paragraph.append(...inlineNodes);
    return;
  }

  appendLiteralMarkdown(paragraph, stringifyTableCellBlockNode(child));
}

function isNormalizedTableCell(cell: TableCellNode): boolean {
  const children = cell.getChildren();
  return (
    children.length === 1 &&
    $isParagraphNode(children[0]) &&
    children[0].getChildren().every(isAllowedTableCellInlineNode)
  );
}

export function normalizeTableCellForMarkdown(cell: TableCellNode): void {
  if (isNormalizedTableCell(cell)) {
    return;
  }

  const paragraph = $createParagraphNode();
  for (const child of cell.getChildren()) {
    normalizeCellChild(child, paragraph);
  }

  cell.clear();
  cell.append(paragraph);
}

export function registerTableCellNormalization(editor: LexicalEditor): () => void {
  return editor.registerNodeTransform(TableCellNode, normalizeTableCellForMarkdown);
}
