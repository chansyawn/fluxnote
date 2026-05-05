import type { Paragraph } from "mdast";

import type { SemanticInline, SemanticParagraph } from "../../core/semantic/document";

export function paragraphFromMdast(
  node: Paragraph,
  readInlines: (children: Paragraph["children"]) => SemanticInline[],
): SemanticParagraph {
  return {
    children: readInlines(node.children),
    type: "paragraph",
  };
}

export function paragraphToMdast(
  node: SemanticParagraph,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => Paragraph["children"],
): Paragraph {
  return {
    children: writeInlines(node.children),
    type: "paragraph",
  };
}
