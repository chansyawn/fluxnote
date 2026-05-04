import type { SerializedEditorState } from "lexical";

interface SerializedLexicalNode {
  children?: SerializedLexicalNode[];
  type?: string;
}

export function collectLexicalNodeTypes(serialized: SerializedEditorState): string[] {
  const types: string[] = [];

  function walk(node: SerializedLexicalNode): void {
    if (node.type) {
      types.push(node.type);
    }

    if (!node.children) {
      return;
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(serialized.root as SerializedLexicalNode);
  return types;
}
