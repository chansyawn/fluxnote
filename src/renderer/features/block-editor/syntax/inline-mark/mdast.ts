import type { Delete, Emphasis, Strong } from "mdast";

import type { SemanticDelete, SemanticEmphasis, SemanticInline, SemanticStrong } from "../../model";

export function emphasisFromMdast(
  node: Emphasis,
  readInlines: (children: Emphasis["children"]) => SemanticInline[],
): SemanticEmphasis {
  return {
    children: readInlines(node.children),
    type: "emphasis",
  };
}

export function strongFromMdast(
  node: Strong,
  readInlines: (children: Strong["children"]) => SemanticInline[],
): SemanticStrong {
  return {
    children: readInlines(node.children),
    type: "strong",
  };
}

export function deleteFromMdast(
  node: Delete,
  readInlines: (children: Delete["children"]) => SemanticInline[],
): SemanticDelete {
  return {
    children: readInlines(node.children),
    type: "delete",
  };
}

export function emphasisToMdast(
  node: SemanticEmphasis,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => Emphasis["children"],
): Emphasis {
  return {
    children: writeInlines(node.children),
    type: "emphasis",
  };
}

export function strongToMdast(
  node: SemanticStrong,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => Strong["children"],
): Strong {
  return {
    children: writeInlines(node.children),
    type: "strong",
  };
}

export function deleteToMdast(
  node: SemanticDelete,
  writeInlines: (children: ReadonlyArray<SemanticInline>) => Delete["children"],
): Delete {
  return {
    children: writeInlines(node.children),
    type: "delete",
  };
}
