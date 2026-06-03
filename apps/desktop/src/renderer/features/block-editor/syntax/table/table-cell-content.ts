import { $createTextNode, $isParagraphNode, $isTextNode, type LexicalNode } from "lexical";
import type { Root } from "mdast";

import { blockFromLexical } from "../../core/lexical-mdast";
import { stringifyMdastToMarkdown } from "../../markdown/processor";

interface TableCellInsertChunk {
  isBlockLiteral: boolean;
  nodes: LexicalNode[];
}

interface TableCellInsertionContent {
  endsWithBlockLiteral: boolean;
  nodes: LexicalNode[];
  startsWithBlockLiteral: boolean;
}

export function isAllowedTableCellInlineNode(node: LexicalNode): boolean {
  return $isTextNode(node) || node.isInline();
}

export function stringifyTableCellBlockNode(node: LexicalNode): string {
  const children = blockFromLexical(node);
  if (children.length === 0) {
    return node.getTextContent();
  }

  return stringifyMdastToMarkdown({ children, type: "root" } satisfies Root);
}

export function collectTableCellInlineNodes(node: LexicalNode): LexicalNode[] {
  if ($isParagraphNode(node)) {
    return node.getChildren().filter(isAllowedTableCellInlineNode);
  }

  return isAllowedTableCellInlineNode(node) ? [node] : [];
}

function createTableCellInsertChunk(node: LexicalNode): TableCellInsertChunk | null {
  const inlineNodes = collectTableCellInlineNodes(node);
  if (inlineNodes.length > 0) {
    return {
      isBlockLiteral: false,
      nodes: inlineNodes,
    };
  }

  const literal = stringifyTableCellBlockNode(node).trim();
  if (literal.length === 0) {
    return null;
  }

  return {
    isBlockLiteral: true,
    nodes: [$createTextNode(literal)],
  };
}

export function createTableCellInsertionContent(
  sourceNodes: LexicalNode[],
): TableCellInsertionContent {
  const chunks = sourceNodes
    .map(createTableCellInsertChunk)
    .filter((chunk): chunk is TableCellInsertChunk => chunk !== null);
  const nodes: LexicalNode[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const previousChunk = chunks[index - 1];
    if (nodes.length > 0 && (previousChunk?.isBlockLiteral || chunk.isBlockLiteral)) {
      nodes.push($createTextNode(" "));
    }

    nodes.push(...chunk.nodes);
  }

  return {
    endsWithBlockLiteral: chunks.at(-1)?.isBlockLiteral ?? false,
    nodes,
    startsWithBlockLiteral: chunks[0]?.isBlockLiteral ?? false,
  };
}
