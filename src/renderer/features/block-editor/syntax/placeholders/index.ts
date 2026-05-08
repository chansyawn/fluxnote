import "./index.css";
import { defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import { PlaceholderBlockNode } from "./placeholder-block-node";
import { PlaceholderInlineNode } from "./placeholder-inline-node";

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
  extension: PLACEHOLDERS_SYNTAX_EXTENSION,
  lexicalNodeNames: ["PlaceholderBlockNode", "PlaceholderInlineNode"],
  mdastTypes: ["html", "imageReference", "math", "inlineMath", "unknown"],
  semanticTypes: ["opaqueBlock", "opaqueInline"],
} satisfies SyntaxRegistration;
