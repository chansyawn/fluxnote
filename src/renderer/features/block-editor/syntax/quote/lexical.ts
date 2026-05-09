import { $createQuoteNode, $isQuoteNode } from "@lexical/rich-text";
import type { LexicalNode } from "lexical";
import type { Blockquote, BlockContent, DefinitionContent } from "mdast";

// mdast Blockquote children allow definitions in addition to plain block content.
type ContainerChild = BlockContent | DefinitionContent;

export function quoteToLexical(
  node: Blockquote,
  writeBlock: (child: ContainerChild) => LexicalNode[],
): LexicalNode {
  const quote = $createQuoteNode();
  quote.append(...node.children.flatMap(writeBlock));
  return quote;
}

export function quoteFromLexical(
  node: LexicalNode,
  readContainer: (children: ReadonlyArray<LexicalNode>) => BlockContent[],
): Blockquote | null {
  if (!$isQuoteNode(node)) {
    return null;
  }

  return {
    children: readContainer(node.getChildren()) as Blockquote["children"],
    type: "blockquote",
  };
}
