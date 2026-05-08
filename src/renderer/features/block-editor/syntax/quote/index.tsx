import { QUOTE } from "@lexical/markdown";
import { RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { QuoteKeyboardPlugin } from "./quote-keyboard-plugin";

export { quoteFromLexical, quoteToLexical } from "./lexical";
export { quoteFromMdast, quoteToMdast } from "./mdast";
export { registerQuoteKeyboardCommands } from "./quote-commands";
export { applyQuoteContainerMarkdownShortcutAtSelection } from "./quote-shortcuts";

export const QUOTE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/quote",
  dependencies: [RichTextExtension],
  theme: {
    quote: "block-editor__quote",
  },
});

export const QUOTE_SYNTAX = {
  id: "quote",
  extension: QUOTE_SYNTAX_EXTENSION,
  lexicalNodeNames: ["QuoteNode"],
  markdownShortcuts: [QUOTE],
  mdastTypes: ["blockquote"],
  runtimePlugins: ({ markdownShortcuts }) => [
    <QuoteKeyboardPlugin key="quote-keyboard" markdownShortcuts={markdownShortcuts} />,
  ],
  semanticTypes: ["blockquote"],
} satisfies SyntaxRegistration;
