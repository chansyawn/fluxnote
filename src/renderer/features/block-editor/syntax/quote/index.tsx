import { QUOTE } from "@lexical/markdown";
import { $isQuoteNode, RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";
import { quoteFromLexical, quoteToLexical } from "./lexical";
import { quoteFromMdast, quoteToMdast } from "./mdast";
import { registerQuoteKeyboardCommands } from "./quote-commands";

export { quoteFromLexical, quoteToLexical } from "./lexical";
export { quoteFromMdast, quoteToMdast } from "./mdast";
export { applyQuoteContainerMarkdownShortcutAtSelection } from "./quote-shortcuts";

export const QUOTE_MARKDOWN_SHORTCUT_TRANSFORMERS = [QUOTE];

export const QUOTE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/quote",
  dependencies: [RichTextExtension, MarkdownShortcutExtension],
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
  extensions: [QUOTE_SYNTAX_EXTENSION],
  lexical: {
    fromBlock: (node, context) =>
      $isQuoteNode(node) ? [quoteFromLexical(node, context.readContainerChildren)] : null,
    toBlock: (node, context) =>
      node.type === "blockquote" ? [quoteToLexical(node, context.writeBlock)] : null,
  },
  lexicalNodeNames: ["QuoteNode"],
  markdownShortcuts: QUOTE_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromBlock: (node, context) =>
      node.type === "blockquote" ? [quoteFromMdast(node, context.readBlocks)] : null,
    toBlock: (node, context) =>
      node.type === "blockquote" ? [quoteToMdast(node, context.writeBlocks)] : null,
  },
  mdastTypes: ["blockquote"],
  semanticTypes: ["blockquote"],
} satisfies SyntaxRegistration;
