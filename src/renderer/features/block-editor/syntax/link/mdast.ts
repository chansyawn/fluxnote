import type { Link } from "mdast";

import type { SemanticInline, SemanticLink } from "../../core/semantic/document";

export function linkFromMdast(
  node: Link,
  readInlines: (children: Link["children"]) => SemanticInline[],
): SemanticLink {
  return {
    children: readInlines(node.children),
    title: node.title ?? null,
    type: "link",
    url: node.url,
  };
}

export function linkToMdast(
  node: SemanticLink,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => Link["children"],
): Link {
  return {
    children: writeInlines(node.children),
    title: node.title,
    type: "link",
    url: node.url,
  };
}
