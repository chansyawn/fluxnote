import type { LexicalNode } from "lexical";
import type { Image } from "mdast";

import { $createImageNode, $isImageNode } from "./image-node";

export function imageToLexical(node: Image): LexicalNode {
  return $createImageNode({
    alt: node.alt ?? "",
    src: node.url,
    title: node.title ?? null,
  });
}

export function imageFromLexical(node: LexicalNode): Image | null {
  if (!$isImageNode(node)) {
    return null;
  }

  return {
    alt: node.getAlt(),
    title: node.getTitle(),
    type: "image",
    url: node.getSrc(),
  };
}
