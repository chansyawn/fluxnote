import type { Root } from "mdast";

interface MdastLikeNode {
  children?: MdastLikeNode[];
  type: string;
}

export function collectMdastNodeTypes(root: Root): string[] {
  const types: string[] = [];

  function walk(node: MdastLikeNode): void {
    types.push(node.type);

    if (!node.children) {
      return;
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root as MdastLikeNode);
  return types;
}
