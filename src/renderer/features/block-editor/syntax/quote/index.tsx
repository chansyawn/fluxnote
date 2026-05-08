import { QUOTE } from "@lexical/markdown";
import { RichTextExtension } from "@lexical/rich-text";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";
import { registerQuoteKeyboardCommands } from "./quote-commands";

export { quoteFromLexical, quoteToLexical } from "./lexical";
export { quoteFromMdast, quoteToMdast } from "./mdast";
export { applyQuoteContainerMarkdownShortcutAtSelection } from "./quote-shortcuts";

export const QUOTE_MARKDOWN_SHORTCUT_TRANSFORMERS = [QUOTE];

export const QUOTE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/quote",
  dependencies: [
    RichTextExtension,
    configExtension(MarkdownShortcutExtension, {
      transformers: QUOTE_MARKDOWN_SHORTCUT_TRANSFORMERS,
    }),
  ],
  theme: {
    quote: "block-editor__quote",
  },
  register(editor, _, state) {
    const { transformers } = state.getDependency(MarkdownShortcutExtension).config;
    return registerQuoteKeyboardCommands(editor, transformers);
  },
});

export const QUOTE_SYNTAX = {
  id: "quote",
  extension: QUOTE_SYNTAX_EXTENSION,
  lexicalNodeNames: ["QuoteNode"],
  mdastTypes: ["blockquote"],
  semanticTypes: ["blockquote"],
} satisfies SyntaxRegistration;
