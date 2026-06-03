import { $createHeadingNode, $isHeadingNode, type HeadingTagType } from "@lexical/rich-text";
import type { LexicalNode } from "lexical";
import type { Heading, PhrasingContent } from "mdast";

type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

function clampDepth(depth: number): HeadingDepth {
  return Math.min(Math.max(Math.trunc(depth), 1), 6) as HeadingDepth;
}

export function depthToHeadingTag(depth: number): HeadingTagType {
  return `h${clampDepth(depth)}` as HeadingTagType;
}

export function headingTagToDepth(tag: HeadingTagType): HeadingDepth {
  return Number(tag.slice(1)) as HeadingDepth;
}

export function headingToLexical(
  node: Heading,
  writeInline: (child: PhrasingContent) => LexicalNode[],
): LexicalNode {
  const heading = $createHeadingNode(depthToHeadingTag(node.depth));
  heading.append(...node.children.flatMap(writeInline));
  return heading;
}

export function headingFromLexical(
  node: LexicalNode,
  readInline: (child: LexicalNode) => PhrasingContent[],
): Heading | null {
  if (!$isHeadingNode(node)) {
    return null;
  }

  return {
    children: node.getChildren().flatMap(readInline),
    depth: headingTagToDepth(node.getTag()),
    type: "heading",
  };
}
