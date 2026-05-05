import { $createParagraphNode, type LexicalNode } from "lexical";

import type { SemanticInline, SemanticParagraph } from "../../core/semantic/document";

export function paragraphToLexical(
  node: SemanticParagraph,
  writeInline: (node: SemanticInline) => LexicalNode[],
): LexicalNode {
  const paragraph = $createParagraphNode();
  paragraph.append(...node.children.flatMap((child) => writeInline(child)));
  return paragraph;
}
