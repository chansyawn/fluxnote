import { QUOTE } from "@lexical/markdown";
import { QuoteNode } from "@lexical/rich-text";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { quoteFromLexical, quoteToLexical } from "./lexical";
export { quoteFromMdast, quoteToMdast } from "./mdast";

export const QUOTE_SYNTAX = {
  id: "quote",
  lexicalNodeNames: ["QuoteNode"],
  mdastTypes: ["blockquote"],
  nodes: [QuoteNode],
  markdownShortcuts: [QUOTE],
  semanticTypes: ["blockquote"],
  theme: {
    quote: "block-editor__quote",
  },
} satisfies SyntaxRegistration;
