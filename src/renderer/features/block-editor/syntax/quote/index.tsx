import { QUOTE } from "@lexical/markdown";
import { QuoteNode } from "@lexical/rich-text";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { QuoteKeyboardPlugin } from "./quote-keyboard-plugin";

export { quoteFromLexical, quoteToLexical } from "./lexical";
export { quoteFromMdast, quoteToMdast } from "./mdast";
export { registerQuoteKeyboardCommands } from "./quote-commands";
export { applyQuoteContainerMarkdownShortcutAtSelection } from "./quote-shortcuts";

export const QUOTE_SYNTAX = {
  id: "quote",
  lexicalNodeNames: ["QuoteNode"],
  mdastTypes: ["blockquote"],
  nodes: [QuoteNode],
  markdownShortcuts: [QUOTE],
  runtimePlugins: ({ markdownShortcuts }) => [
    <QuoteKeyboardPlugin key="quote-keyboard" markdownShortcuts={markdownShortcuts} />,
  ],
  semanticTypes: ["blockquote"],
  theme: {
    quote: "block-editor__quote",
  },
} satisfies SyntaxRegistration;
