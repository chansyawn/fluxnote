import { $isLineBreakNode, $isTextNode, type LexicalNode } from "lexical";

import type { SemanticBlock, SemanticInline } from "./document";

interface LexicalContainerChildrenOptions {
  children: ReadonlyArray<LexicalNode>;
  inlineFromLexical: (node: LexicalNode) => SemanticInline[];
  blockFromLexical: (node: LexicalNode) => SemanticBlock[];
}

function isInlineRuntimeNode(node: LexicalNode): boolean {
  return node.isInline() || $isTextNode(node) || $isLineBreakNode(node);
}

function flushInlineParagraph(
  blocks: SemanticBlock[],
  inlineBuffer: SemanticInline[],
): SemanticInline[] {
  if (inlineBuffer.length === 0) {
    return inlineBuffer;
  }

  blocks.push({ children: inlineBuffer, type: "paragraph" });
  return [];
}

export function lexicalContainerChildrenToBlocks({
  blockFromLexical,
  children,
  inlineFromLexical,
}: LexicalContainerChildrenOptions): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  let inlineBuffer: SemanticInline[] = [];

  for (const child of children) {
    if (isInlineRuntimeNode(child)) {
      inlineBuffer.push(...inlineFromLexical(child));
      continue;
    }

    inlineBuffer = flushInlineParagraph(blocks, inlineBuffer);
    blocks.push(...blockFromLexical(child));
  }

  flushInlineParagraph(blocks, inlineBuffer);
  return blocks;
}
