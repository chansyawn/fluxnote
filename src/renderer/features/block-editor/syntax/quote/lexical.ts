import { $createQuoteNode, type QuoteNode } from "@lexical/rich-text";
import type { LexicalNode } from "lexical";

import type { SemanticBlock, SemanticBlockquote } from "../../model";

export function quoteToLexical(
  node: SemanticBlockquote,
  writeBlock: (node: SemanticBlock) => LexicalNode[],
): LexicalNode {
  const quote = $createQuoteNode();
  quote.append(...node.children.flatMap((child) => writeBlock(child)));
  return quote;
}

export function quoteFromLexical(
  node: QuoteNode,
  readContainerChildren: (children: ReadonlyArray<LexicalNode>) => SemanticBlock[],
): SemanticBlockquote {
  return {
    children: readContainerChildren(node.getChildren()),
    type: "blockquote",
  };
}
