import type { Blockquote, RootContent } from "mdast";

import type { SemanticBlock, SemanticBlockquote } from "../../core/semantic/document";

export function quoteFromMdast(
  node: Blockquote,
  readBlocks: (children: ReadonlyArray<RootContent>) => SemanticBlock[],
): SemanticBlockquote {
  return {
    children: readBlocks(node.children),
    type: "blockquote",
  };
}

export function quoteToMdast(
  node: SemanticBlockquote,
  writeBlocks: (children: ReadonlyArray<SemanticBlock>) => Blockquote["children"],
): Blockquote {
  return {
    children: writeBlocks(node.children),
    type: "blockquote",
  };
}
