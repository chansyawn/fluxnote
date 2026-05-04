import { $getRoot, type EditorState, type ElementNode, type LexicalNode } from "lexical";
import type { Root } from "mdast";

import type { ExportContext, ExportedMdastNode } from "./syntax-module";
import { lexicalExporters } from "./syntax-registry";

function exportChildren(node: LexicalNode): ExportedMdastNode[] {
  if (!("getChildren" in node) || typeof node.getChildren !== "function") {
    return [];
  }

  return (node as ElementNode).getChildren().flatMap(exportNode);
}

function exportNode(node: LexicalNode): ExportedMdastNode[] {
  const exporter = lexicalExporters.get(node.getType());
  if (!exporter) {
    return [];
  }

  return exporter(node, exportContext);
}

const exportContext: ExportContext = {
  exportChildren,
  exportNode,
};

export function exportLexicalToMdast(editorState: EditorState): Root {
  let root: Root = { children: [], type: "root" };

  editorState.read(() => {
    root = {
      children: $getRoot().getChildren().flatMap(exportNode) as Root["children"],
      type: "root",
    };
  });

  return root;
}
