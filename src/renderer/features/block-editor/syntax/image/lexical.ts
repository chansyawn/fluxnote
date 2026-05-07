import type { LexicalNode } from "lexical";

import type { SemanticImage } from "../../model";
import { $createImageNode, type ImageNode } from "./image-node";

export function imageToLexical(node: SemanticImage): LexicalNode {
  return $createImageNode({
    alt: node.alt,
    src: node.url,
    title: node.title,
  });
}

export function imageFromLexical(node: ImageNode): SemanticImage {
  return {
    alt: node.getAlt(),
    title: node.getTitle(),
    type: "image",
    url: node.getSrc(),
  };
}
