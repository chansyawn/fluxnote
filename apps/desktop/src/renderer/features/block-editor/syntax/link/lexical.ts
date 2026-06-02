import { $createLinkNode, $isAutoLinkNode, $isLinkNode } from "@lexical/link";
import type { LexicalNode } from "lexical";
import type { Link, PhrasingContent } from "mdast";

export function linkToLexical(
  node: Link,
  writeInline: (child: PhrasingContent) => LexicalNode[],
): LexicalNode {
  const link = $createLinkNode(node.url, { title: node.title });
  link.append(...node.children.flatMap(writeInline));
  return link;
}

export function linkFromLexical(
  node: LexicalNode,
  readInline: (child: LexicalNode) => PhrasingContent[],
): Link | null {
  if (!$isLinkNode(node) || $isAutoLinkNode(node)) {
    return null;
  }

  return {
    children: node.getChildren().flatMap(readInline) as Link["children"],
    title: node.getTitle() ?? null,
    type: "link",
    url: node.getURL(),
  };
}
