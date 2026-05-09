import { $createParagraphNode, $isParagraphNode, type LexicalNode } from "lexical";
import type { Paragraph, PhrasingContent } from "mdast";

export function paragraphToLexical(
  node: Paragraph,
  writeInline: (child: PhrasingContent) => LexicalNode[],
): LexicalNode {
  const paragraph = $createParagraphNode();
  paragraph.append(...node.children.flatMap(writeInline));
  return paragraph;
}

export function paragraphFromLexical(
  node: LexicalNode,
  readInline: (child: LexicalNode) => PhrasingContent[],
): Paragraph | null {
  if (!$isParagraphNode(node)) {
    return null;
  }

  return {
    children: node.getChildren().flatMap(readInline),
    type: "paragraph",
  };
}
