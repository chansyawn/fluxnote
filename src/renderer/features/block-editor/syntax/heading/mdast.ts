import type { Heading } from "mdast";

import type { HeadingDepth, SemanticHeading, SemanticInline } from "../../core/semantic/document";

function toHeadingDepth(depth: number): HeadingDepth {
  return Math.min(Math.max(Math.trunc(depth), 1), 6) as HeadingDepth;
}

export function headingFromMdast(
  node: Heading,
  readInlines: (children: Heading["children"]) => SemanticInline[],
): SemanticHeading {
  return {
    children: readInlines(node.children),
    depth: toHeadingDepth(node.depth),
    type: "heading",
  };
}

export function headingToMdast(
  node: SemanticHeading,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => Heading["children"],
): Heading {
  return {
    children: writeInlines(node.children),
    depth: node.depth,
    type: "heading",
  };
}
