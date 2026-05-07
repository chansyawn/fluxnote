import type { Image } from "mdast";

import type { SemanticImage } from "../../model";

export function imageFromMdast(node: Image): SemanticImage {
  return {
    alt: node.alt ?? "",
    title: node.title ?? null,
    type: "image",
    url: node.url,
  };
}

export function imageToMdast(node: SemanticImage): Image {
  return {
    alt: node.alt,
    title: node.title,
    type: "image",
    url: node.url,
  };
}
