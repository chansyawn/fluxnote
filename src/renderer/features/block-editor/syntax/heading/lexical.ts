import { $createHeadingNode, type HeadingTagType } from "@lexical/rich-text";
import type { LexicalNode } from "lexical";

import type { HeadingDepth, SemanticHeading, SemanticInline } from "../../core/semantic/document";

export function toHeadingTag(depth: HeadingDepth): HeadingTagType {
  return `h${depth}` as HeadingTagType;
}

export function headingTagToDepth(tag: HeadingTagType): HeadingDepth {
  return Number(tag.slice(1)) as HeadingDepth;
}

export function headingToLexical(
  node: SemanticHeading,
  writeInline: (node: SemanticInline) => LexicalNode[],
): LexicalNode {
  const heading = $createHeadingNode(toHeadingTag(node.depth));
  heading.append(...node.children.flatMap((child) => writeInline(child)));
  return heading;
}
