import { QUOTE } from "@lexical/markdown";
import { RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import { registerQuoteKeyboardCommands } from "./quote-commands";

export { quoteFromLexical, quoteToLexical } from "./lexical";
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
