import "./index.css";
import { defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import {
  opaqueBlockFromLexical,
  opaqueBlockToLexical,
  opaqueInlineFromLexical,
  opaqueInlineToLexical,
} from "./lexical";
import {
  opaqueBlockFromMdast,
  opaqueBlockToMdast,
  opaqueInlineFallbackParagraph,
  opaqueInlineFromMdast,
  opaqueInlineToMdast,
} from "./mdast";
import { $isPlaceholderBlockNode, PlaceholderBlockNode } from "./placeholder-block-node";
import { $isPlaceholderInlineNode, PlaceholderInlineNode } from "./placeholder-inline-node";

export {
  $createPlaceholderBlockNode,
  $isPlaceholderBlockNode,
  PlaceholderBlockNode,
  type SerializedPlaceholderBlockNode,
} from "./placeholder-block-node";
export {
  $createPlaceholderInlineNode,
  $isPlaceholderInlineNode,
  PlaceholderInlineNode,
  type SerializedPlaceholderInlineNode,
} from "./placeholder-inline-node";
export {
  opaqueBlockFromLexical,
  opaqueBlockToLexical,
  opaqueInlineFromLexical,
  opaqueInlineToLexical,
} from "./lexical";
export {
  opaqueBlockFromMdast,
  opaqueBlockToMdast,
  opaqueInlineFallbackParagraph,
  opaqueInlineFromMdast,
  opaqueInlineToMdast,
} from "./mdast";
export { createPlaceholderPayload, type PlaceholderPayload } from "./placeholder-payload";

export const PLACEHOLDERS_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/placeholders",
  nodes: [PlaceholderBlockNode, PlaceholderInlineNode],
});

export const PLACEHOLDERS_SYNTAX = {
  id: "placeholders",
  extensions: [PLACEHOLDERS_SYNTAX_EXTENSION],
  lexical: {
    fromBlock: (node) => ($isPlaceholderBlockNode(node) ? [opaqueBlockFromLexical(node)] : null),
    fromInline: (node) => ($isPlaceholderInlineNode(node) ? [opaqueInlineFromLexical(node)] : null),
    toBlock: (node) => (node.type === "opaqueBlock" ? [opaqueBlockToLexical(node)] : null),
    toInline: (node) => (node.type === "opaqueInline" ? [opaqueInlineToLexical(node)] : null),
  },
  lexicalNodeNames: ["PlaceholderBlockNode", "PlaceholderInlineNode"],
  mdast: {
    fromBlock: (node) => [opaqueBlockFromMdast(node)],
    fromInline: (node) => [opaqueInlineFromMdast(node)],
    toBlock: (node) => {
      if (node.type !== "opaqueBlock") {
        return null;
      }

      const parsed = opaqueBlockToMdast(node);
      return parsed.length > 0 ? parsed : [opaqueInlineFallbackParagraph(node.markdown)];
    },
    toInline: (node) => (node.type === "opaqueInline" ? opaqueInlineToMdast(node) : null),
  },
  mdastTypes: ["html", "imageReference", "math", "inlineMath", "unknown"],
  semanticTypes: ["opaqueBlock", "opaqueInline"],
} satisfies SyntaxRegistration;
