import type { LexicalNode } from "lexical";

import type { SemanticOpaqueBlock, SemanticOpaqueInline } from "../../model";
import { $createPlaceholderBlockNode, type PlaceholderBlockNode } from "./placeholder-block-node";
import {
  $createPlaceholderInlineNode,
  type PlaceholderInlineNode,
} from "./placeholder-inline-node";

export function opaqueBlockToLexical(node: SemanticOpaqueBlock): LexicalNode {
  return $createPlaceholderBlockNode(node.markdown, node.kind, node.metadata);
}

export function opaqueBlockFromLexical(node: PlaceholderBlockNode): SemanticOpaqueBlock {
  return {
    kind: node.getKind(),
    markdown: node.getMarkdown(),
    ...(node.getMetadata() ? { metadata: node.getMetadata() } : {}),
    type: "opaqueBlock",
  };
}

export function opaqueInlineToLexical(node: SemanticOpaqueInline): LexicalNode {
  return $createPlaceholderInlineNode(node.markdown, node.kind, node.metadata);
}

export function opaqueInlineFromLexical(node: PlaceholderInlineNode): SemanticOpaqueInline {
  return {
    kind: node.getKind(),
    markdown: node.getMarkdown(),
    ...(node.getMetadata() ? { metadata: node.getMetadata() } : {}),
    type: "opaqueInline",
  };
}
